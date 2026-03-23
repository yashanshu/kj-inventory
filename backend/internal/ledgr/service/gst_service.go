// Package service contains the Ledgr business logic layer.
// Services coordinate repositories; they do not know about HTTP.
package service

import "hasufel.kj/internal/ledgr/domain"

// GSTResult holds the decomposed amounts after applying a GST rate.
type GSTResult struct {
	BasePaise  int64 // pre-GST amount
	GSTPaise   int64 // total GST
	CGSTPaise  int64 // 0 if interstate
	SGSTPaise  int64 // 0 if interstate
	IGSTPaise  int64 // 0 if intrastate
	TotalPaise int64 // gross amount
}

// ComputeGST calculates GST decomposition for a given amount.
// amountPaise: the entered amount in paise.
// inclusive: true if the entered amount already includes GST.
// interstate: true if IGST applies (interstate transaction).
func ComputeGST(amountPaise int64, rate domain.GSTRate, inclusive, interstate bool) GSTResult {
	rateInt := gstRateToInt(rate)
	if rateInt == 0 {
		return GSTResult{
			BasePaise:  amountPaise,
			TotalPaise: amountPaise,
		}
	}

	var basePaise, gstPaise int64
	if inclusive {
		// amount includes GST: base = amount * 100 / (100 + rate)
		basePaise = amountPaise * 100 / int64(100+rateInt)
		gstPaise = amountPaise - basePaise
	} else {
		basePaise = amountPaise
		gstPaise = amountPaise * int64(rateInt) / 100
	}

	totalPaise := amountPaise
	if !inclusive {
		totalPaise = basePaise + gstPaise
	}

	var cgst, sgst, igst int64
	if interstate {
		igst = gstPaise
	} else {
		cgst = gstPaise / 2
		sgst = gstPaise - cgst // absorbs rounding remainder
	}

	return GSTResult{
		BasePaise:  basePaise,
		GSTPaise:   gstPaise,
		CGSTPaise:  cgst,
		SGSTPaise:  sgst,
		IGSTPaise:  igst,
		TotalPaise: totalPaise,
	}
}

func gstRateToInt(r domain.GSTRate) int {
	switch r {
	case domain.GSTRate5:
		return 5
	case domain.GSTRate12:
		return 12
	case domain.GSTRate18:
		return 18
	case domain.GSTRate28:
		return 28
	}
	return 0
}
