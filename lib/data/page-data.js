const fs = require('fs');
const uuid = require('uuid/v4');

class PageData {
  constructor(options = {}) {
    if(typeof(options.webAppConfig) == 'object') {
      this.webAppConfig = options.webAppConfig;
    }

    this.pages = [];
  }

  loadFile(filePath) {
    let rawJson = fs.readFileSync(filePath);
    this.pages = JSON.parse(rawJson);
  }

  saveToFile(fileName) {
    fs.writeFile(fileName, JSON.stringify(this.pages), (error) => {
      if(error) {
        console.log('Error saving file!');
      }
    });
  }

  pageCrawledCallback(pageUrl, currentUser) {
    const createdAt = new Date();

    this.pages.push({
      id: uuid(),
      pageUrl: pageUrl,
      user: currentUser,
      createdAt: createdAt,
      dialogsOpened: [],
      buttonsClicked: [],
      buttonsIgnored: []
    });
  }

  buttonIgnoredCallback(pageUrl, buttonHTML, currentUser) {
    const page = this._findPage(pageUrl, currentUser);

    //console.log(`Button ignored: ${pageUrl}, ${buttonHTML}`);
    page.buttonsIgnored.push(buttonHTML);
  }

  buttonClickedCallback(pageUrl, buttonHTML, currentUser) {
    const page = this._findPage(pageUrl, currentUser);

    page.buttonsClicked.push(buttonHTML);
    console.log(`Button clicked: ${buttonHTML} on ${pageUrl} as ${currentUser}`)
  }

  dialogCallback(pageUrl, currentUser, dialog) {
    const page = this._findPage(pageUrl, currentUser);

    console.log(`Handled dialog at ${pageUrl}: ${dialog.message()}`);
    page.dialogsOpened.push({
      message: dialog.message(),
      type: dialog.type()
    });
  }

  _findPage(pageUrl, user) {
    return this.pages.find((page) => {
      return (page.pageUrl == pageUrl && page.user == user);
    });
  }
}

module.exports = PageData;