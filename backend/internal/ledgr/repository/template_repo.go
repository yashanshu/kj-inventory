package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"hasufel.kj/internal/ledgr/domain"
)

// NewTemplateRepository returns a TemplateRepository backed by SQLite.
func NewTemplateRepository(db *sql.DB) TemplateRepository {
	return &templateRepo{db: db}
}

type templateRepo struct {
	db *sql.DB
}

func (r *templateRepo) List(ctx context.Context, orgID string) ([]*domain.Template, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, org_id, name, category_id, amount_paise,
		       funding_source, payment_method, gst_rate, gst_inclusive,
		       store_id, description, sort_order, created_at
		FROM ledgr_templates
		WHERE org_id = ?
		ORDER BY sort_order, name
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.Template
	for rows.Next() {
		t, err := scanTemplate(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, t)
	}
	return result, rows.Err()
}

func (r *templateRepo) GetByID(ctx context.Context, orgID, id string) (*domain.Template, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, org_id, name, category_id, amount_paise,
		       funding_source, payment_method, gst_rate, gst_inclusive,
		       store_id, description, sort_order, created_at
		FROM ledgr_templates
		WHERE org_id = ? AND id = ?
	`, orgID, id)
	t, err := scanTemplateRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return t, err
}

func (r *templateRepo) Create(ctx context.Context, t *domain.Template) error {
	t.CreatedAt = time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ledgr_templates
			(org_id, name, category_id, amount_paise, funding_source, payment_method,
			 gst_rate, gst_inclusive, store_id, description, sort_order, created_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
	`,
		t.OrgID, t.Name, t.CategoryID, nullInt64(t.AmountPaise),
		string(t.FundingSource), string(t.PaymentMethod),
		string(t.GSTRate), boolInt(t.GSTInclusive),
		nullStr(t.StoreID), nullStr(t.Description), t.SortOrder, t.CreatedAt,
	)
	return err
}

func (r *templateRepo) Update(ctx context.Context, t *domain.Template) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE ledgr_templates SET
			name=?, category_id=?, amount_paise=?,
			funding_source=?, payment_method=?,
			gst_rate=?, gst_inclusive=?,
			store_id=?, description=?, sort_order=?
		WHERE org_id=? AND id=?
	`,
		t.Name, t.CategoryID, nullInt64(t.AmountPaise),
		string(t.FundingSource), string(t.PaymentMethod),
		string(t.GSTRate), boolInt(t.GSTInclusive),
		nullStr(t.StoreID), nullStr(t.Description), t.SortOrder,
		t.OrgID, t.ID,
	)
	return err
}

func (r *templateRepo) Delete(ctx context.Context, orgID, id string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM ledgr_templates WHERE org_id = ? AND id = ?`, orgID, id)
	return err
}

// ---- scan helpers ----

func scanTemplate(r *sql.Rows) (*domain.Template, error) {
	var t domain.Template
	var amountPaise sql.NullInt64
	var storeID, description sql.NullString
	var gstInclusive int
	var fs, pm, gr string
	err := r.Scan(
		&t.ID, &t.OrgID, &t.Name, &t.CategoryID, &amountPaise,
		&fs, &pm, &gr, &gstInclusive,
		&storeID, &description, &t.SortOrder, &t.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if amountPaise.Valid {
		t.AmountPaise = &amountPaise.Int64
	}
	if storeID.Valid {
		t.StoreID = &storeID.String
	}
	if description.Valid {
		t.Description = &description.String
	}
	t.FundingSource = domain.FundingSource(fs)
	t.PaymentMethod = domain.PaymentMethod(pm)
	t.GSTRate = domain.GSTRate(gr)
	t.GSTInclusive = gstInclusive == 1
	return &t, nil
}

func scanTemplateRow(r *sql.Row) (*domain.Template, error) {
	var t domain.Template
	var amountPaise sql.NullInt64
	var storeID, description sql.NullString
	var gstInclusive int
	var fs, pm, gr string
	err := r.Scan(
		&t.ID, &t.OrgID, &t.Name, &t.CategoryID, &amountPaise,
		&fs, &pm, &gr, &gstInclusive,
		&storeID, &description, &t.SortOrder, &t.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if amountPaise.Valid {
		t.AmountPaise = &amountPaise.Int64
	}
	if storeID.Valid {
		t.StoreID = &storeID.String
	}
	if description.Valid {
		t.Description = &description.String
	}
	t.FundingSource = domain.FundingSource(fs)
	t.PaymentMethod = domain.PaymentMethod(pm)
	t.GSTRate = domain.GSTRate(gr)
	t.GSTInclusive = gstInclusive == 1
	return &t, nil
}

func nullInt64(v *int64) sql.NullInt64 {
	if v == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: *v, Valid: true}
}
