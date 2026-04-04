import QRCode from "qrcode";

export async function generateQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
  });
}

export async function generateQrBuffer(content: string): Promise<Buffer> {
  return QRCode.toBuffer(content, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
  });
}
