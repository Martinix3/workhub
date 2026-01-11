/**
 * Triggers a browser file download from string content
 * @param content - The file content as a string
 * @param filename - The name of the file to download
 * @param mimeType - The MIME type of the file (e.g., 'text/csv', 'application/json')
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  try {
    // Create a blob from the content
    const blob = new Blob([content], { type: mimeType })

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob)

    // Create a temporary anchor element
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.style.display = 'none'

    // Append to body, click, and cleanup
    document.body.appendChild(anchor)
    anchor.click()

    // Cleanup
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  } catch (error) {
    throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Downloads JSON data as a formatted JSON file
 * @param data - The data to download (will be stringified)
 * @param filename - The name of the file (without extension)
 */
export function downloadJSON(data: unknown, filename: string): void {
  const content = JSON.stringify(data, null, 2)
  const fullFilename = filename.endsWith('.json') ? filename : `${filename}.json`
  downloadFile(content, fullFilename, 'application/json')
}

/**
 * Downloads CSV data
 * @param content - The CSV content as a string
 * @param filename - The name of the file (without extension)
 */
export function downloadCSV(content: string, filename: string): void {
  const fullFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`
  downloadFile(content, fullFilename, 'text/csv')
}
