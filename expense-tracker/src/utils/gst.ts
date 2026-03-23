export type GSTRate = 0 | 5 | 12 | 18 | 28;

export interface GSTResult {
  basePaise: number;    // pre-GST amount
  gstPaise: number;     // total GST
  cgstPaise: number;    // 0 if interstate
  sgstPaise: number;    // 0 if interstate
  igstPaise: number;    // 0 if intrastate
  totalPaise: number;   // gross amount
}

/**
 * Computes GST decomposition for a given amount.
 *
 * @param amountPaise - the entered amount in paise (integer)
 * @param rate        - GST rate as a number: 0 | 5 | 12 | 18 | 28
 * @param inclusive   - true if amountPaise already includes GST
 * @param interstate  - true if IGST applies (interstate transaction)
 */
export function computeGST(
  amountPaise: number,
  rate: GSTRate,
  inclusive: boolean,
  interstate: boolean
): GSTResult {
  if (rate === 0) {
    return {
      basePaise: amountPaise,
      gstPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      totalPaise: amountPaise,
    };
  }

  let basePaise: number;
  let gstPaise: number;

  if (inclusive) {
    // Amount includes GST: base = amount * 100 / (100 + rate)
    basePaise = Math.round((amountPaise * 100) / (100 + rate));
    gstPaise = amountPaise - basePaise;
  } else {
    basePaise = amountPaise;
    gstPaise = Math.round((amountPaise * rate) / 100);
  }

  const totalPaise = inclusive ? amountPaise : basePaise + gstPaise;

  let cgstPaise = 0, sgstPaise = 0, igstPaise = 0;
  if (interstate) {
    igstPaise = gstPaise;
  } else {
    cgstPaise = Math.round(gstPaise / 2);
    sgstPaise = gstPaise - cgstPaise; // absorbs rounding remainder
  }

  return { basePaise, gstPaise, cgstPaise, sgstPaise, igstPaise, totalPaise };
}
