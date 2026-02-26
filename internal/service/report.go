package service

import (
	"encoding/json"
	"fmt"

	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
)

type ReportService interface {
	ListReports(userID string, typeVal *int, nextMarker string, pageSize int) ([]model.ReportV2, int64, error)
	ReplyReport(id, content, mediaID, userID string) error
}

type reportService struct {
	repo repository.ReportRepository
}

func NewReportService(repo repository.ReportRepository) ReportService {
	return &reportService{repo: repo}
}

func (s *reportService) ListReports(userID string, typeVal *int, nextMarker string, pageSize int) ([]model.ReportV2, int64, error) {
	return s.repo.ListReports(userID, typeVal, nextMarker, pageSize)
}

func (s *reportService) ReplyReport(id, content, mediaID, userID string) error {
	report, err := s.repo.GetReport(id, userID)
	if err != nil {
		return err
	}
	
	report.Answer = &content
	if mediaID != "" {
		report.ReplyMediaID = &mediaID
	}
	if err := s.repo.UpdateReport(report); err != nil {
		return err
	}
	
	// Create notification for member
	type Content struct {
		Content string `json:"content"`
	}
	contentJSON, _ := json.Marshal(Content{Content: content})
	contentStr := string(contentJSON)
	uniqueID := fmt.Sprintf("report_reply_%s", report.ID)
	
	if _, err := s.repo.GetNotificationByUniqueID(uniqueID); err != nil {
		// Not found, create
		notification := model.MemberNotification{
			ID:       member.Rid(),
			UniqueID: uniqueID,
			Content:  &contentStr,
			Type:     1,
			Status:   1,
			MemberID: report.MemberID,
		}
		return s.repo.CreateNotification(&notification)
	}
	return nil
}
