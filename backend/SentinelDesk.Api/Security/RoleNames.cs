namespace SentinelDesk.Api.Security;

public static class RoleNames
{
    public const string Viewer = "Viewer";
    public const string Analyst = "Analyst";
    public const string Admin = "Admin";
    public const string AnalystOrAdmin = Analyst + "," + Admin;
}
