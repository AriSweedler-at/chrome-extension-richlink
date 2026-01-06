class SpinnakerHandler extends Handler {
  parseSpinnakerUrl(url) {
    // Remove protocol and split by '/'
    // Expected format: https://spinnaker.k8s.{env}.cloud/#/applications/{app}/executions[/{executionId}]

    // Check domain pattern
    if (!url.includes('spinnaker.k8s.') || !url.includes('.cloud')) {
      return null;
    }

    // Split URL into parts
    const hashIndex = url.indexOf('#/');
    if (hashIndex === -1) return null;

    const pathPart = url.substring(hashIndex + 2); // Skip '#/'
    const parts = pathPart.split('/');

    // Validate structure: ['applications', '{app}', 'executions', ...optional executionId]
    if (parts.length < 3) return null;
    if (parts[0] !== 'applications') return null;
    if (parts[2] !== 'executions') return null;

    const applicationName = parts[1];
    if (!applicationName) return null;

    // Check if there's an execution ID (4th part before any query params)
    let executionId = null;
    if (parts.length >= 4 && parts[3]) {
      // Remove query params from execution ID
      executionId = parts[3].split('?')[0];
    }

    return {
      applicationName,
      executionId
    };
  }

  extractPipelineName(executionId) {
    try {
      const executionDiv = document.getElementById(`execution-${executionId}`);
      if (!executionDiv) {
        NotificationSystem.showDebug(`SpinnakerHandler: Could not find execution div for ID ${executionId}`);
        return null;
      }

      NotificationSystem.showDebug('SpinnakerHandler: Found execution div');

      // Traverse up to find the execution-group (the top-level container with showing-details)
      const executionGroup = executionDiv.closest('.execution-group');
      if (!executionGroup) {
        NotificationSystem.showDebug('SpinnakerHandler: Could not find execution-group');
        return null;
      }

      NotificationSystem.showDebug('SpinnakerHandler: Found execution-group');

      // The h4 is inside the sticky-header at the top of the execution-group
      const titleElement = executionGroup.querySelector('h4.execution-group-title');
      if (!titleElement) {
        NotificationSystem.showDebug('SpinnakerHandler: Could not find h4.execution-group-title');
        return null;
      }

      // Get only direct text nodes, excluding spans
      const pipelineName = Array.from(titleElement.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .join(' ');
      NotificationSystem.showDebug(`SpinnakerHandler: Found pipeline name: ${pipelineName}`);
      return pipelineName;
    } catch (error) {
      NotificationSystem.showDebug(`SpinnakerHandler: Error extracting pipeline name: ${error.message}`);
      return null;
    }
  }

  canHandle(url) {
    return this.parseSpinnakerUrl(url) !== null;
  }

  async extractInfo() {
    const currentUrl = window.location.href;
    NotificationSystem.showDebug(`SpinnakerHandler: Processing URL: ${currentUrl}`);

    const parsed = this.parseSpinnakerUrl(currentUrl);
    if (!parsed) {
      NotificationSystem.showDebug('SpinnakerHandler: Failed to parse URL');
      throw new Error('Could not parse Spinnaker URL');
    }

    const { applicationName, executionId } = parsed;
    NotificationSystem.showDebug(`SpinnakerHandler: Application name: ${applicationName}`);

    // If no execution ID, we're on the executions list page
    if (!executionId) {
      NotificationSystem.showDebug('SpinnakerHandler: On executions list page');
      const titleUrl = currentUrl.split('?')[0]; // Clean any query params
      return new WebpageInfo({
        titleText: applicationName,
        titleUrl: titleUrl,
        headerText: null,
        headerUrl: null
      });
    }

    NotificationSystem.showDebug(`SpinnakerHandler: Execution ID: ${executionId}`);

    // Extract pipeline name from DOM
    const pipelineName = this.extractPipelineName(executionId);

    // Use spinnaker style:
    // First click: show header as "spinnaker: ${pipelineName}" with full execution URL
    // Second click: show base application name with executions list URL
    const baseUrl = currentUrl.split('/executions')[0] + '/executions';

    return new WebpageInfo({
      titleText: applicationName,
      titleUrl: baseUrl,
      headerText: pipelineName,
      headerUrl: currentUrl,
      style: "spinnaker"
    });
  }
}
