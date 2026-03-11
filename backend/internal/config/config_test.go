package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNormalizeSQLiteDSN_FromRepoRootKeepsBackendPath(t *testing.T) {
	wd := t.TempDir()
	if err := os.MkdirAll(filepath.Join(wd, "backend", "data"), 0o755); err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}

	runInDir(t, wd, func() {
		got := normalizeSQLiteDSN("file:./backend/data/inventory.db?_fk=1")
		want := "file:./backend/data/inventory.db?_fk=1"
		if got != want {
			t.Fatalf("normalizeSQLiteDSN() = %q, want %q", got, want)
		}
	})
}

func TestNormalizeSQLiteDSN_FromBackendDirRewritesBackendPrefix(t *testing.T) {
	wd := t.TempDir()
	if err := os.MkdirAll(filepath.Join(wd, "backend", "data"), 0o755); err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}

	runInDir(t, filepath.Join(wd, "backend"), func() {
		got := normalizeSQLiteDSN("file:./backend/data/inventory.db?_fk=1")
		want := "file:./data/inventory.db?_fk=1"
		if got != want {
			t.Fatalf("normalizeSQLiteDSN() = %q, want %q", got, want)
		}
	})
}

func TestNormalizeSQLiteDSN_NonSQLiteURLUnchanged(t *testing.T) {
	got := normalizeSQLiteDSN("postgresql://user:pass@localhost/inventory?sslmode=disable")
	want := "postgresql://user:pass@localhost/inventory?sslmode=disable"
	if got != want {
		t.Fatalf("normalizeSQLiteDSN() = %q, want %q", got, want)
	}
}

func runInDir(t *testing.T, dir string, fn func()) {
	t.Helper()

	prev, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd failed: %v", err)
	}

	if err := os.Chdir(dir); err != nil {
		t.Fatalf("chdir failed: %v", err)
	}

	defer func() {
		if err := os.Chdir(prev); err != nil {
			t.Fatalf("restore chdir failed: %v", err)
		}
	}()

	fn()
}
