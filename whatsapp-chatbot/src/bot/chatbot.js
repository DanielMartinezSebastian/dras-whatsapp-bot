class Chatbot {
  constructor(whatsappClient, messageHandler, logWatcher) {
    this.whatsappClient = whatsappClient;
    this.messageHandler = messageHandler;
    this.logWatcher = logWatcher;

    this.initialize();
  }

  initialize() {
    this.logWatcher.watchLog(this.handleNewMessage.bind(this));
  }

  handleNewMessage(message) {
    const response = this.messageHandler.processMessage(message);
    this.whatsappClient.sendMessage(response);
  }
}

export default Chatbot;
