class AirtableHandler extends Handler {
  getBaseLabel() {
    return 'Record Title';
  }

  canHandle(url) {
    // Known Airtable applications that this handler supports
    const airtableApplications = [
      {
        base: "listable",
        url: "https://airtable.com/apptivTqaoebkrmV1/pagYS8GHSAS9swLLI",
        page: "✅ Task Detail (Sidesheet+Fullscreen, Global, v2025.04.24) page",
      },
      {
        base: "escalations",
        url: "https://airtable.com/appWh5G6JXbHDKC2b/paguOM7Eb387ZUnRE",
        page: "UNKNOWN",
      },
    ];

    // Check if URL matches any known application
    const match = airtableApplications.find(app => url.startsWith(app.url));
    return match !== undefined;
  }

  async extractInfo() {
    // Get the record title from the page
    const titleElement = document.querySelector('.heading-size-default');
    if (!titleElement) {
      throw new Error("Could not find title element");
    }

    const titleText = titleElement.textContent.trim();
    const titleUrl = window.location.href;

    NotificationSystem.showDebug(`AirtableHandler: Extracting from title="${titleText}"`);
    NotificationSystem.showDebug(`AirtableHandler: titleUrl="${titleUrl}"`);

    return new WebpageInfo({ titleText, titleUrl, headerText: null, headerUrl: null });
  }
}
