using RelatioApp.Application.Common.Interfaces;

namespace RelatioApp.Infrastructure.Files;

/// <summary>Stores uploaded photos on the local filesystem (mounted volume in Docker).</summary>
public class LocalFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalFileStorage(string rootPath)
    {
        _root = rootPath;
        Directory.CreateDirectory(_root);
    }

    public async Task SaveAsync(string fileName, byte[] content, CancellationToken ct = default)
    {
        var safeName = GuardFileName(fileName);
        await File.WriteAllBytesAsync(Path.Combine(_root, safeName), content, ct);
    }

    public void Delete(string fileName)
    {
        var safeName = GuardFileName(fileName);
        var path = Path.Combine(_root, safeName);
        if (File.Exists(path)) File.Delete(path);
    }

    private static string GuardFileName(string fileName)
    {
        var name = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(name) ||
            !string.Equals(name, fileName, StringComparison.Ordinal))
        {
            throw new ArgumentException("Invalid file name.", nameof(fileName));
        }
        return name;
    }
}
