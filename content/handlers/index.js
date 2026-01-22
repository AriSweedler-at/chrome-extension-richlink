// Central registry of all handlers
// This ensures handlers are always used in the same order everywhere

function getAllHandlers() {
  return [
    new GoogleDocsHandler(),
    new AtlassianHandler(),
    new AirtableHandler(),
    new GitHubHandler(),
    new SpinnakerHandler(),
    new SpaceliftHandler(),
    new RawTitleHandler(),
    new RawUrlHandler(),
  ];
}
