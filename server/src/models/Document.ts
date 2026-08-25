import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  borrowerId: mongoose.Types.ObjectId;
  loanId?: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  documentType: 'salary_slip';
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    borrowerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan' },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    documentType: { type: String, enum: ['salary_slip'], required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDocument>('Document', DocumentSchema);
