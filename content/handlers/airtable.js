class AirtableHandler extends Handler {
  // Known Airtable applications that this handler supports
  airtableApplications = [
    {
      base: "listable",
      url: "https://airtable.com/apptivTqaoebkrmV1/pagYS8GHSAS9swLLI",
      label: "Listable Title",
    },
    {
      base: "escalations",
      url: "https://airtable.com/appWh5G6JXbHDKC2b/paguOM7Eb387ZUnRE",
      label: "Escalation Title",
    },
  ];

  getBaseLabel() {
    const currentUrl = window.location ? window.location.href : '';
    const match = this.airtableApplications.find(app => currentUrl.startsWith(app.url));
    return match ? match.label : 'Record Title';
  }

  skipRawTitleHandler() {
    return true; // AirtableHandler is essentially same as RawTitleHandler
  }

  canHandle(url) {
    // Check if URL matches any known application
    const match = this.airtableApplications.find(app => url.startsWith(app.url));
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
