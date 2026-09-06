namespace RelatioApp.Application.Features.Charts.Commands;

/// <summary>Content sniffing + helpers for the image types we accept as node photos.</summary>
public static class ImageContent
{
    public const long MaxPhotoBytes = 5 * 1024 * 1024;

    private const string UploadsPrefix = "/api/uploads/";

    /// <summary>
    /// Returns the file extension for the detected image, or null when the bytes
    /// are not one of the supported formats (JPEG, PNG, GIF, WebP).
    /// </summary>
    public static string? DetectExtension(byte[] content)
    {
        if (content.Length >= 3 && content[0] == 0xFF && content[1] == 0xD8 && content[2] == 0xFF)
        {
            return "jpg";
        }

        if (content.Length >= 8 &&
            content[0] == 0x89 && content[1] == 0x50 && content[2] == 0x4E &&
            content[3] == 0x47 && content[4] == 0x0D && content[5] == 0x0A &&
            content[6] == 0x1A && content[7] == 0x0A)
        {
            return "png";
        }

        if (content.Length >= 6 &&
            content[0] == (byte)'G' && content[1] == (byte)'I' &&
            content[2] == (byte)'F' && content[3] == (byte)'8')
        {
            return "gif";
        }

        if (content.Length >= 12 &&
            content[0] == (byte)'R' && content[1] == (byte)'I' &&
            content[2] == (byte)'F' && content[3] == (byte)'F' &&
            content[8] == (byte)'W' && content[9] == (byte)'E' &&
            content[10] == (byte)'B' && content[11] == (byte)'P')
        {
            return "webp";
        }

        return null;
    }

    /// <summary>
    /// Extracts the stored file name from a photo URL we manage, or null when the
    /// value is empty or an external URL we do not own.
    /// </summary>
    public static string? FileNameFromUrl(string? photoUrl)
    {
        if (string.IsNullOrEmpty(photoUrl) ||
            !photoUrl.StartsWith(UploadsPrefix, StringComparison.Ordinal))
        {
            return null;
        }
        return photoUrl[UploadsPrefix.Length..];
    }
}
