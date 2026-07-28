export function groupSessionsIntoDocuments<T>(sessions: T[], sessionsPerDocument = 2): T[][] {
  if (!Number.isInteger(sessionsPerDocument) || sessionsPerDocument < 1) {
    throw new Error("sessionsPerDocument must be a positive integer");
  }

  const documents: T[][] = [];
  for (let index = 0; index < sessions.length; index += sessionsPerDocument) {
    documents.push(sessions.slice(index, index + sessionsPerDocument));
  }
  return documents;
}
