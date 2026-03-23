package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"hasufel.kj/internal/ledgr/domain"
	"hasufel.kj/internal/ledgr/repository"
)

// AttachmentService handles file upload and metadata storage for expense receipts.
type AttachmentService struct {
	attachments   repository.AttachmentRepository
	attachmentDir string
	maxSize       int64
}

// NewAttachmentService creates an AttachmentService.
// attachmentDir is the local filesystem path where files are saved.
// maxSize is the maximum accepted file size in bytes.
func NewAttachmentService(attachments repository.AttachmentRepository, attachmentDir string, maxSize int64) *AttachmentService {
	return &AttachmentService{
		attachments:   attachments,
		attachmentDir: attachmentDir,
		maxSize:       maxSize,
	}
}

// Upload saves the multipart file to disk and records metadata.
func (s *AttachmentService) Upload(ctx context.Context, expenseID, uploadedBy string, fh *multipart.FileHeader) (*domain.Attachment, error) {
	if fh.Size > s.maxSize {
		return nil, fmt.Errorf("file exceeds maximum size of %d bytes", s.maxSize)
	}

	f, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()

	fileType := detectFileType(fh.Filename, fh.Header.Get("Content-Type"))
	ext := filepath.Ext(fh.Filename)
	safeName := fmt.Sprintf("%d_%s%s", time.Now().UnixMilli(), sanitizeFilename(fh.Filename), ext)
	destPath := filepath.Join(s.attachmentDir, expenseID)

	if err := os.MkdirAll(destPath, 0755); err != nil {
		return nil, err
	}

	dest := filepath.Join(destPath, safeName)
	out, err := os.Create(dest)
	if err != nil {
		return nil, err
	}
	defer out.Close()

	if _, err := io.Copy(out, f); err != nil {
		return nil, err
	}

	a := &domain.Attachment{
		ExpenseID:  expenseID,
		FileName:   fh.Filename,
		FileType:   fileType,
		FileURL:    "/api/v1/ledgr/attachments/" + expenseID + "/" + safeName,
		FileSize:   fh.Size,
		UploadedBy: uploadedBy,
	}
	if err := s.attachments.Create(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

// Get returns attachment metadata by ID.
func (s *AttachmentService) Get(ctx context.Context, id string) (*domain.Attachment, error) {
	a, err := s.attachments.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if a == nil {
		return nil, errors.New("attachment not found")
	}
	return a, nil
}

// Delete removes the file from disk and the metadata record.
func (s *AttachmentService) Delete(ctx context.Context, id string) error {
	a, err := s.attachments.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if a == nil {
		return errors.New("attachment not found")
	}
	// Best-effort file removal — don't fail if file is already gone.
	_ = os.Remove(filepath.Join(s.attachmentDir, a.ExpenseID, filepath.Base(a.FileURL)))
	return s.attachments.Delete(ctx, id)
}

// ---- helpers ----

func detectFileType(filename, contentType string) string {
	lower := strings.ToLower(contentType + " " + filename)
	if strings.Contains(lower, "pdf") {
		return "pdf"
	}
	if strings.ContainsAny(lower, "png jpg jpeg gif webp image") {
		return "image"
	}
	return "screenshot"
}

func sanitizeFilename(name string) string {
	ext := filepath.Ext(name)
	base := strings.TrimSuffix(name, ext)
	safe := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '_'
	}, base)
	if len(safe) > 40 {
		safe = safe[:40]
	}
	return safe
}
