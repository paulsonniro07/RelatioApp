namespace RelatioApp.Application.Common.Exceptions;

/// <summary>Small helper for building field-level validation errors.</summary>
public static class ValidationErrors
{
    public static ValidationException Field(string field, string message)
        => new(new Dictionary<string, string[]> { [field] = [message] });
}
