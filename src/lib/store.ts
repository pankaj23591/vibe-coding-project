import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { CallAnalysis, CallRecord, TranscriptSegment } from "./types";
import { getPool } from "./mysql";

type CallRow = {
  id: string;
  created_at: string;
  original_filename: string;
  audio_relative_path: string;
  transcript_json: string;
  analysis_json: string;
};

function rowToRecord(row: CallRow): CallRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    originalFilename: row.original_filename,
    audioRelativePath: row.audio_relative_path,
    transcript: JSON.parse(row.transcript_json) as TranscriptSegment[],
    analysis: JSON.parse(row.analysis_json) as CallAnalysis,
  };
}

export async function saveCall(record: CallRecord): Promise<void> {
  const p = await getPool();
  await p.query(
    `INSERT INTO calls (
      id, created_at, original_filename, audio_relative_path, transcript_json, analysis_json
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      created_at = VALUES(created_at),
      original_filename = VALUES(original_filename),
      audio_relative_path = VALUES(audio_relative_path),
      transcript_json = VALUES(transcript_json),
      analysis_json = VALUES(analysis_json)`,
    [
      record.id,
      record.createdAt,
      record.originalFilename,
      record.audioRelativePath,
      JSON.stringify(record.transcript),
      JSON.stringify(record.analysis),
    ],
  );
}

export async function getCall(id: string): Promise<CallRecord | null> {
  const p = await getPool();
  const [rows] = await p.query<RowDataPacket[]>("SELECT * FROM calls WHERE id = ?", [id]);
  const row = rows[0] as CallRow | undefined;
  if (!row) return null;
  return rowToRecord(row);
}

export async function listCalls(): Promise<CallRecord[]> {
  const p = await getPool();
  const [rows] = await p.query<RowDataPacket[]>(
    "SELECT * FROM calls ORDER BY created_at DESC",
  );
  return (rows as CallRow[]).map(rowToRecord);
}

export async function deleteCall(id: string): Promise<boolean> {
  const p = await getPool();
  const [res] = await p.query<ResultSetHeader>("DELETE FROM calls WHERE id = ?", [id]);
  return res.affectedRows > 0;
}
