package analysis

import (
	"context"
	"testing"
)

// Mocks

type MockUser struct{}

func (m *MockUser) GetID() string            { return "user1" }
func (m *MockUser) GetFilenameRules() string { return "{}" }
func (m *MockUser) GetIgnoreFiles() []string { return []string{"ignored"} }

type MockDrive struct {
	HasRoot bool
}

func (m *MockDrive) GetID() string   { return "drive1" }
func (m *MockDrive) GetName() string { return "My Drive" }
func (m *MockDrive) GetProfile() DriveProfile {
	return DriveProfile{TotalSize: 1000, RootFolderID: "root", RootFolderName: "root"}
}
func (m *MockDrive) HasRootFolder() bool { return m.HasRoot }
func (m *MockDrive) GetClient() any      { return nil }

type MockWalker struct {
	OnFile    func(file File) error
	OnEpisode func(parsed any) error
	OnMovie   func(parsed any) error
	OnProfile func(profile any) error
	Filter    func(curFile FileInfo) (bool, error)
	RunCalled bool
}

func (m *MockWalker) SetOnError(f func(file File))           {}
func (m *MockWalker) SetOnFile(f func(file File) error)      { m.OnFile = f }
func (m *MockWalker) SetOnEpisode(f func(parsed any) error)  { m.OnEpisode = f }
func (m *MockWalker) SetOnMovie(f func(parsed any) error)    { m.OnMovie = f }
func (m *MockWalker) SetOnProfile(f func(profile any) error) { m.OnProfile = f }
func (m *MockWalker) SetFilter(f func(curFile FileInfo) (bool, error)) {
	m.Filter = f
}
func (m *MockWalker) Run(folder any, paths []string) error {
	m.RunCalled = true
	// Simulate walk
	if m.OnFile != nil {
		m.OnFile(File{FileID: "f1", Name: "test.mp4", Size: 100})
	}
	return nil
}

type MockSearcher struct{}

func (m *MockSearcher) OnPercent(f func(percent float64)) {}

type MockStore struct {
	CreatedFiles []FileData
}

func (m *MockStore) FindFile(ctx context.Context, fileID, userID, driveID string) (*FileRecord, error) {
	return nil, nil // Not found
}
func (m *MockStore) CreateFile(ctx context.Context, data FileData) error {
	m.CreatedFiles = append(m.CreatedFiles, data)
	return nil
}
func (m *MockStore) UpdateFile(ctx context.Context, id string, data FileUpdateData) error {
	return nil
}
func (m *MockStore) FindTmpFile(ctx context.Context, fileID, userID, driveID string) (*FileRecord, error) {
	return nil, nil
}
func (m *MockStore) DeleteTmpFile(ctx context.Context, id string) error {
	return nil
}

type MockProcessorFactory struct{}

func (m *MockProcessorFactory) NewEpisodeFileProcessor(uniqueID string, episode any, user User, drive Drive, store Store, onPrint func(ArticleNode)) Processor {
	return &MockProcessor{}
}
func (m *MockProcessorFactory) NewMovieFileProcessor(uniqueID string, movie any, userID, driveID string, store Store) Processor {
	return &MockProcessor{}
}
func (m *MockProcessorFactory) NewMediaProfileProcessor(token, assets string, store Store, user User, drive Drive, searcher MediaSearcher) Processor {
	return &MockProcessor{}
}

type MockProcessor struct{}

func (m *MockProcessor) Run(input any) ProcessorResult {
	return ProcessorResult{}
}

func TestDriveAnalysis_Run(t *testing.T) {
	mockStore := &MockStore{}
	mockWalker := &MockWalker{}
	
	props := DriveAnalysisProps{
		UniqueID:         "test_run",
		Assets:           "/tmp",
		User:             &MockUser{},
		Drive:            &MockDrive{HasRoot: true},
		Store:            mockStore,
		Walker:           mockWalker,
		Searcher:         &MockSearcher{},
		ProcessorFactory: &MockProcessorFactory{},
		FolderFactory: func(id string, client any) any {
			return "mock_folder"
		},
	}

	da, err := NewDriveAnalysis(props)
	if err != nil {
		t.Fatalf("NewDriveAnalysis failed: %v", err)
	}

	err = da.Run(nil)
	if err != nil {
		t.Errorf("Run failed: %v", err)
	}

	if !mockWalker.RunCalled {
		t.Error("Walker.Run was not called")
	}

	if len(mockStore.CreatedFiles) != 1 {
		t.Errorf("Expected 1 file created, got %d", len(mockStore.CreatedFiles))
	} else {
		if mockStore.CreatedFiles[0].Name != "test.mp4" {
			t.Errorf("Expected file name test.mp4, got %s", mockStore.CreatedFiles[0].Name)
		}
	}
}

func TestDriveAnalysis_Run_NoRoot(t *testing.T) {
	props := DriveAnalysisProps{
		UniqueID:         "test_no_root",
		Assets:           "/tmp",
		User:             &MockUser{},
		Drive:            &MockDrive{HasRoot: false},
		Store:            &MockStore{},
		Walker:           &MockWalker{},
		Searcher:         &MockSearcher{},
		ProcessorFactory: &MockProcessorFactory{},
	}

	da, err := NewDriveAnalysis(props)
	if err != nil {
		t.Fatalf("NewDriveAnalysis failed: %v", err)
	}

	err = da.Run(nil)
	if err == nil {
		t.Error("Expected error when no root folder, got nil")
	}
}
