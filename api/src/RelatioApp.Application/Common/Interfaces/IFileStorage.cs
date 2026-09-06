namespace RelatioApp.Application.Common.Interfaces;

/// <summary>Abstraction over where uploaded photo files are stored.</summary>
public interface IFileStorage
{
    /// <summary>
    /// Saves file bytes under a simple file name (no path separators).
    /// </summary>
    Task SaveAsync(string fileName, byte[] content, CancellationToken ct = default);

    /// <summary>Deletes a stored file. Missing files are ignored.</summary>
    void Delete(string fileName);
}
