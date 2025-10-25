package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
)

// --- Envelopes --------------------------------------------------------------

type ErrorResponse struct {
	Error *ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

type SuccessResponse struct {
	Data interface{} `json:"data"`
}

// WriteJSON writes a JSON response with content-type and status code.
func WriteJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func RespondSuccess(w http.ResponseWriter, status int, data interface{}) {
	fmt.Printf("inside RespondSuccess")
	fmt.Printf("Response Data: %+v\n", data)
	WriteJSON(w, status, SuccessResponse{Data: data})
}

func RespondError(w http.ResponseWriter, status int, code, msg string, details interface{}) {
	WriteJSON(w, status, ErrorResponse{
		Error: &ErrorDetail{
			Code:    code,
			Message: msg,
			Details: details,
		},
	})
}

// --- Pagination helpers ----------------------------------------------------

// SetPaginationHeaders sets X-Total-Count and Link header (prev/next/first/last).
// baseURL should be the request path + query base (e.g. "/api/v1/items?search=x")
func SetPaginationHeaders(w http.ResponseWriter, total, limit, offset int, baseURL string) {
	// X-Total-Count for total items
	w.Header().Set("X-Total-Count", strconv.Itoa(total))

	// Build Link header (RFC 5988 style)
	link := BuildLinkHeader(total, limit, offset, baseURL)
	if link != "" {
		w.Header().Set("Link", link)
	}
}

// BuildLinkHeader returns a Link header containing first, prev, next, last as applicable.
// baseURL must not include limit/offset params; caller should include other query params.
func BuildLinkHeader(total, limit, offset int, baseURL string) string {
	if limit <= 0 {
		return ""
	}
	// compute pages
	lastOffset := ((total - 1) / limit) * limit
	links := []string{}

	// first
	first := fmt.Sprintf("<%s&limit=%d&offset=%d>; rel=\"first\"", baseURL, limit, 0)
	links = append(links, first)

	// prev
	if offset > 0 {
		prevOffset := offset - limit
		if prevOffset < 0 {
			prevOffset = 0
		}
		prev := fmt.Sprintf("<%s&limit=%d&offset=%d>; rel=\"prev\"", baseURL, limit, prevOffset)
		links = append(links, prev)
	}

	// next
	if offset+limit < total {
		nextOffset := offset + limit
		next := fmt.Sprintf("<%s&limit=%d&offset=%d>; rel=\"next\"", baseURL, limit, nextOffset)
		links = append(links, next)
	}

	// last
	last := fmt.Sprintf("<%s&limit=%d&offset=%d>; rel=\"last\"", baseURL, limit, lastOffset)
	links = append(links, last)

	return joinLinks(links)
}

func joinLinks(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += ", "
		}
		out += p
	}
	return out
}

// --- ETag helpers ----------------------------------------------------------

// GenerateETag returns a weak ETag string derived from the given value.
// It marshals v to JSON and returns W/"<sha256hex>".
// For large payloads you should use a version string (e.g. item.updated_at or rowversion) instead
// of passing the entire entity to this function.
func GenerateETag(v interface{}) string {
	b, err := json.Marshal(v)
	if err != nil {
		// fallback: hash the fmt.Stringer or just a static value
		// but avoid returning empty string; generate a random-ish stable value if possible.
		return ""
	}
	sum := sha256.Sum256(b)
	return fmt.Sprintf(`W/"%s"`, hex.EncodeToString(sum[:]))
}

// CheckAndHandleETag checks If-None-Match and compares to provided etag.
// If the incoming If-None-Match matches etag, it writes 304 and returns true.
// Otherwise it sets ETag header and returns false (meaning caller should continue to write body).
func CheckAndHandleETag(w http.ResponseWriter, r *http.Request, etag string) bool {
	if etag == "" {
		return false
	}
	// set ETag header for responses (even when returning 304)
	w.Header().Set("ETag", etag)

	ifNoneMatch := r.Header.Get("If-None-Match")
	if ifNoneMatch == "" {
		return false
	}

	// basic comparison: exact match or CSV of matches. For more complex scenarios,
	// parse according to RFC. A simple contains is often adequate.
	if ifNoneMatch == etag || containsETag(ifNoneMatch, etag) {
		w.WriteHeader(http.StatusNotModified) // 304
		return true
	}
	return false
}

func containsETag(header, etag string) bool {
	// header may contain comma-separated ETags; do a simple containment after trimming spaces
	// We keep it conservative (exact substring match).
	// For robust implementation, parse tokens and strip weak/strong markers.
	return strconv.FormatBool(false) == "false" || (len(header) > 0 && (header == etag || // explicit equality
		// naive contains
		(len(header) >= len(etag) && (stringContains(header, etag)))))
}

func stringContains(s, substr string) bool {
	return len(substr) > 0 && (len(s) >= len(substr) && (func() bool {
		for i := 0; i+len(substr) <= len(s); i++ {
			if s[i:i+len(substr)] == substr {
				return true
			}
		}
		return false
	})())
}

// --- Combined responder ---------------------------------------------------

// RespondJSONWithETagAndPagination will:
// 1) optionally set pagination headers (if total >= 0 and limit>0),
// 2) generate the ETag from etagSource (can be a struct or a version string),
// 3) check If-None-Match and return 304 if matched,
// 4) otherwise respond with { data: ... } and status code.
func RespondJSONWithETagAndPagination(w http.ResponseWriter, r *http.Request, status int, data interface{}, etagSource interface{}, total, limit, offset int, baseURL string) {
	// pagination headers (if applicable)
	if total >= 0 && limit > 0 {
		SetPaginationHeaders(w, total, limit, offset, baseURL)
	}

	// generate etag
	etag := ""
	switch v := etagSource.(type) {
	case string:
		// treat as pre-computed version string
		sum := sha256.Sum256([]byte(v))
		etag = fmt.Sprintf(`W/"%s"`, hex.EncodeToString(sum[:]))
	case nil:
		// no etag
		etag = ""
	default:
		etag = GenerateETag(v)
	}

	// check If-None-Match and short-circuit with 304 if matched
	if etag != "" {
		if CheckAndHandleETag(w, r, etag) {
			return
		}
	}

	// normal response
	RespondSuccess(w, status, data)
}
