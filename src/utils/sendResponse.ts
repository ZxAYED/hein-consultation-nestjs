export function sendResponse(message: string, data?: any) {
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
