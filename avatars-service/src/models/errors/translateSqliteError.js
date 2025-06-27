export function translateSqliteError(error) {
  // SQLITE_CONSTRAINT (19) errors
  if (error.errno == 19) {
    const message = error.message;

    if (message.includes("UNIQUE")) {
      return uniqueConstraintErrors(message);
    }
    if (message.includes("NOT NULL")) {
      return notNullConstraintErrors(message);
    }
  }
  
  return error;
}

function uniqueConstraintErrors(message) {
  const field = getField(message);
  const error = new Error(`${field} already exists. `);
  return error;
}

function notNullConstraintErrors(message) {
  const field = getField(message);
  const error = new Error(`${field} is required.`);
  return error;
}

function getField(message) {
  const constraintField = message.split(": ")[2];
  const field = constraintField.split(".")[1];
  return field;
}
