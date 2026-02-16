package member

import (
	"crypto/rand"
	"encoding/hex"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/domain/user"
	"github.com/family-flix/api/internal/model"
)

func Rid() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)[:15]
}

// CreateWithoutAccount creates a member without email/password credentials.
// Returns the member id and a token record.
func CreateWithoutAccount(remark, userID string, db *gorm.DB) (memberID string, tokenID string, tokenValue string, err error) {
	memberID = Rid()
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&model.Member{ID: memberID, Remark: remark, UserID: userID}).Error; err != nil {
			return err
		}
		data := "{}"
		if err := tx.Create(&model.MemberSetting{ID: Rid(), Data: data, MemberID: memberID}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return
	}
	tokenValue, err = user.EncodeToken(memberID)
	if err != nil {
		return
	}
	tokenRec := model.MemberToken{ID: Rid(), Token: tokenValue, MemberID: memberID}
	if err = db.Create(&tokenRec).Error; err != nil {
		return
	}
	tokenID = tokenRec.ID
	return
}
