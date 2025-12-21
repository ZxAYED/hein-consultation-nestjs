export function sendResponse(message: string, data?: unknown) {
  if (data) {
    return {
      success: true,
      message,
      data: data || null,
    };
  } else {
    return {
      success: true,
      message,
    };
  }
}
