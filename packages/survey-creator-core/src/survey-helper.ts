import {
  Base,
  Helpers,
  ISurveyElement,
  ItemValue,
  JsonObjectProperty,
  SurveyElement,
  Serializer,
  SurveyModel,
  PageModel,
} from "survey-core";
import { editorLocalization } from "./editorLocalization";
import { ISurveyCreatorOptions } from "./creator-settings";
import { wrapTextByCurlyBraces } from "./utils/utils";

export enum ObjType {
  Unknown = "unknown",
  Survey = "survey",
  Page = "page",
  Panel = "panel",
  Question = "question",
  Column = "column"
}
export class SurveyHelper {
  public static getNewElementName(el: ISurveyElement): string {
    const survey: SurveyModel = (<any>el).getSurvey();
    if(!survey) return el.name;
    if(el.isPage) return this.getNewPageName(survey.pages);
    if(el.isPanel) return this.getNewPanelName(survey.getAllPanels());
    return this.getNewQuestionName(survey.getAllQuestions(false, false, true));
  }
  public static getNewPageName(objs: Array<any>) {
    return SurveyHelper.getNewName(
      objs,
      editorLocalization.getString("ed.newPageName")
    );
  }
  public static isPageNameAutoGenerated(name: string): boolean {
    return SurveyHelper.isNameAutoGenerated(name, editorLocalization.getString("ed.newPageName"));
  }
  public static isPagePropertiesAreModified(page: PageModel): boolean {
    if (!SurveyHelper.isPageNameAutoGenerated(page.name)) return true;
    const json = page.toJSON();
    delete json["name"];
    delete json["elements"];
    //If there is at least one property in page is set, then return true
    for (var key in json) return true;
    return false;
  }
  public static getNewQuestionName(objs: Array<any>) {
    return SurveyHelper.getNewName(
      objs,
      editorLocalization.getString("ed.newQuestionName")
    );
  }
  public static getNewPanelName(objs: Array<any>) {
    return SurveyHelper.getNewName(
      objs,
      editorLocalization.getString("ed.newPanelName")
    );
  }
  public static generateNewName(name: string): string {
    var pos = name.length;
    while (pos > 0 && name[pos - 1] >= "0" && name[pos - 1] <= "9") {
      pos--;
    }
    var base = name.substring(0, pos);
    var num = 0;
    if (pos < name.length) {
      num = parseInt(name.substring(pos));
    }
    num++;
    return base + num;
  }
  public static getNewName(objs: Array<any>, baseName: string): string {
    var hash = {};
    for (var i = 0; i < objs.length; i++) {
      hash[objs[i].name] = true;
    }
    var num = 1;
    while (true) {
      if (!hash[baseName + num.toString()]) break;
      num++;
    }
    return baseName + num.toString();
  }
  public static isNameAutoGenerated(name: string, baseName: string): boolean {
    if (!name || name.length < baseName.length) return false;
    const digits = name.substring(baseName.length);
    return Helpers.isNumber(digits);
  }
  public static getObjectType(obj: any): ObjType {
    if (!obj || !obj["getType"]) return ObjType.Unknown;
    if (obj.isPage) return ObjType.Page;
    if (obj.isPanel) return ObjType.Panel;
    if (obj.getType() == "survey") return ObjType.Survey;
    if (obj.getType() == "matrixdropdowncolumn") return ObjType.Column;
    if (obj.isQuestion) return ObjType.Question;
    return ObjType.Unknown;
  }
  public static getObjectTypeStr(obj: any): string {
    var objType = SurveyHelper.getObjectType(obj);
    if (objType === ObjType.Survey) return "survey";
    if (objType === ObjType.Page) return "page";
    if (objType === ObjType.Panel) return "panel";
    if (objType === ObjType.Question) return "question";
    if (objType === ObjType.Column) return "column";
    return "unknown";
  }

  public static getObjectName(obj: any, showObjectTitle = false): string {
    var objType = SurveyHelper.getObjectType(obj);
    if (objType === ObjType.Survey)
      return editorLocalization.getString("ed.surveyTypeName");
    if (showObjectTitle && obj["title"]) return obj["title"];
    if (showObjectTitle && obj["text"]) return obj["text"];
    if (obj["name"]) return obj["name"];
    return "";
  }
  public static getElements(element: any, includeHidden: boolean = false): Array<any> {
    if (!element) return [];
    if (element.getElementsInDesign)
      return element.getElementsInDesign(includeHidden);
    if (element.elements) return element.elements;
    return [];
  }
  public static addElements(elements: Array<any>, isPanel: boolean, result: Array<any>) {
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].isPanel === isPanel) {
        result.push(elements[i]);
      }
      SurveyHelper.addElements(SurveyHelper.getElements(elements[i]), isPanel, result);
    }
  }
  public static getAllElements(survey: SurveyModel, isPanel: boolean): Array<any> {
    const result = [];
    for (let i = 0; i < survey.pages.length; i++) {
      SurveyHelper.addElements(survey.pages[i].elements, isPanel, result);
    }
    return result;
  }
  public static isPropertyVisible(
    obj: any,
    property: JsonObjectProperty,
    options: ISurveyCreatorOptions = null,
    showMode: string = null,
    parentObj: any = null,
    parentProperty: JsonObjectProperty = null
  ): boolean {
    if (!property || !property.visible) return false;
    if (!!showMode && !!property.showMode && showMode !== property.showMode)
      return false;
    if (
      !!property.isVisible &&
      !!obj.getLayoutType &&
      !(<any>property["isVisible"])(obj.getLayoutType(), null)
    )
      return false;
    var canShow = !!options
      ? (object: any, property: JsonObjectProperty) => {
        return options.onCanShowPropertyCallback(
          object,
          property,
          showMode,
          parentObj,
          parentProperty
        );
      }
      : null;
    if (!!canShow && !canShow(obj, property)) return false;
    return true;
  }
  public static scrollIntoViewIfNeeded(el: HTMLElement, getOptions?: (overTop: boolean) => ScrollIntoViewOptions, scrollIfElementBiggerThanContainer: boolean = false) {
    if (!el || !el.scrollIntoView) return;
    var rect = el.getBoundingClientRect();
    var scrollableDiv = SurveyHelper.getScrollableDiv(el);
    if (!scrollableDiv) return;
    var height = scrollableDiv.clientHeight;
    if (rect.top < scrollableDiv.offsetTop) {
      el.scrollIntoView(getOptions ? getOptions(true) : true);
    } else {
      let offsetTop = height + scrollableDiv.offsetTop;
      if (rect.bottom > offsetTop && (rect.height < height || scrollIfElementBiggerThanContainer)) {
        el.scrollIntoView(getOptions ? getOptions(false) : false);
      }
    }
  }
  public static getScrollableDiv(el: HTMLElement): HTMLElement {
    while (!!el) {
      if (!!el.id && el.id.indexOf("scrollableDiv") > -1) return el;
      if (!el.offsetParent) return null;
      el = <HTMLElement>el.offsetParent;
    }
    return null;
  }
  public static moveItemInArray(
    list: Array<any>,
    obj: any,
    newIndex: number
  ): boolean {
    if (!list || list.length < 2) return false;
    if (newIndex < 0 || newIndex >= list.length) return false;
    var oldIndex = list.indexOf(obj);
    if (oldIndex < 0 || oldIndex == newIndex) return false;
    for (var i = 0; i < list.length; i++) {
      SurveyHelper.disableSelectingObj(list[i]);
    }
    list.splice(oldIndex, 1);
    list.splice(newIndex, 0, obj);
    for (var i = 0; i < list.length; i++) {
      SurveyHelper.enableSelectingObj(list[i]);
    }
    return true;
  }
  public static applyItemValueArray(
    dest: Array<ItemValue>,
    src: Array<ItemValue>
  ) {
    if (!src || src.length == 0) {
      dest.splice(0, dest.length);
      return;
    }
    if (dest.length > src.length) {
      dest.splice(src.length, dest.length - src.length);
    }
    if (dest.length < src.length) {
      var insertedArray = [];
      for (var i = dest.length; i < src.length; i++) {
        insertedArray.push(src[i]);
      }
      dest.splice.apply(dest, [dest.length, 0].concat(insertedArray));
    }
    for (var i = 0; i < dest.length; i++) {
      if (dest[i].value != src[i].value) {
        dest[i].value = src[i].value;
      }
      dest[i].text = src[i].hasText ? src[i].text : "";
    }
  }
  public static disableSelectingObj(obj: Base) {
    obj["disableSelecting"] = true;
  }
  public static enableSelectingObj(obj: Base) {
    delete obj["disableSelecting"];
  }
  public static canSelectObj(obj: Base) {
    return !obj || obj["disableSelecting"] !== true;
  }
  public static warnNonSupported(name: string, newPropertyName?: string) {
    let outputText = wrapTextByCurlyBraces(name) + " is not supported in V2.";
    if (!!newPropertyName) {
      outputText += " Use the '" + newPropertyName + "' property instead";
    }
    SurveyHelper.warnText(outputText);
  }
  public static warnText(text: string) {
    // eslint-disable-next-line no-console
    console.warn(text);
  }
  private static deleteConditionProperties(json: any) {
    delete json["visible"];
    delete json["visibleIf"];
    delete json["readOnly"];
    delete json["enableIf"];
    delete json["valueName"];
    delete json["choicesVisibleIf"];
    delete json["choicesEnableIf"];
    delete json["width"];
    delete json["minWidth"];
    delete json["maxWidth"];
  }
  private static deleteRandomProperties(json: any) {
    ["choicesOrder", "rowsOrder"].forEach(prop => {
      if(json[prop] === "random") {
        delete json[prop];
      }
    });
  }
  public static updateQuestionJson(questionJson: any) {
    questionJson.storeOthersAsComment = false;
    delete questionJson.valuePropertyName;
    SurveyHelper.deleteConditionProperties(questionJson);
    SurveyHelper.deleteRandomProperties(questionJson);
    SurveyHelper.deleteConditionPropertiesFromArray(questionJson.choices);
    SurveyHelper.deleteConditionPropertiesFromArray(questionJson.rows);
    SurveyHelper.deleteConditionPropertiesFromArray(questionJson.columns);
    SurveyHelper.deleteConditionPropertiesFromArray(questionJson.rates);
  }
  private static deleteConditionPropertiesFromArray(jsonArray: Array<any>): void {
    if(!Array.isArray(jsonArray)) return;
    jsonArray.forEach(item => {
      SurveyHelper.deleteConditionProperties(item);
    });
  }
  public static convertMatrixRowsToText(rows: any): string {
    var result = rows
      .filter((row) => !row.cells[0].hasError)
      .map((row) =>
        row.cells
          .map((cell) => cell.value || "")
          .join(ItemValue.Separator)
          .replace(/\|$/, "")
      )
      .join("\n");

    return result;
  }

  public static convertItemValuesToText(items: ItemValue[]): string {
    var text = "";

    items.forEach((item) => {
      if (text) text += "\n";
      text += item.value;
      if (item.pureText) text += ItemValue.Separator + item.pureText;
    });

    return text;
  }

  public static convertTextToItemValues(
    text: string,
    properties: JsonObjectProperty[],
    className: string
  ): ItemValue[] {
    var items = [];
    if (!text) return items;

    var texts = text.split("\n");
    for (var i = 0; i < texts.length; i++) {
      if (!texts[i]) continue;
      var elements = texts[i].split(ItemValue.Separator);
      var valueItem = Serializer.createClass(className);
      properties.forEach((p, i) => {
        valueItem[p.name] = elements[i];
      });
      items.push(valueItem);
    }

    return items;
  }
  public static sortItems(items: Array<any>, propertyName = "text") {
    const getNumber = (str: string, index): number => {
      let strNum = "";
      while (index < str.length && str[index] >= "0" && str[index] <= "9") {
        strNum += str[index];
        index++;
      }
      return parseFloat(strNum);
    };
    items.sort((a: any, b: any): number => {
      const aVal = !!a[propertyName] ? a[propertyName] : "";
      const bVal = !!b[propertyName] ? b[propertyName] : "";
      let index = 0;
      while (index < aVal.length && index < bVal.length && aVal[index] === bVal[index]) index++;
      if (index < aVal.length && index < bVal.length) {
        while (index > 0 && (aVal[index - 1] >= "0" && aVal[index - 1] <= "9")) index--;
        const aNum = getNumber(aVal, index);
        const bNum = getNumber(bVal, index);
        if (aNum < bNum) return -1;
        if (aNum > bNum) return 1;
      }
      return aVal.localeCompare(bVal);
    });
  }
  public static getQuestionContextIndexInfo(name: string, prefix: string = ""): { index: number, name: string } {
    const contextStrings = ["row", "panel"];
    for (var i = 0; i < contextStrings.length; i++) {
      const subStr = prefix + contextStrings[i] + ".";
      const index = name.indexOf(subStr);
      if (index > -1) return { index: index, name: subStr };
    }
    return undefined;
  }
  public static isSupportCellEditor(type: string): boolean {
    const supportedTypes = ["selectbase", "boolean", "rating"];
    for (let i = 0; i < supportedTypes.length; i++) {
      if (Serializer.isDescendantOf(type, supportedTypes[i])) return true;
    }
    return false;
  }
  public static getElementDeepLength(element: SurveyElement): number {
    let res: number = 0;
    while (!!element) {
      if (element.isPanel) res++;
      element = <SurveyElement><any>element.parent;
    }
    return res;
  }
}