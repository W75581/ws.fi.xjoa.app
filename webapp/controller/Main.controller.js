sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/util/File",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/type/String",
    "sap/ui/table/Column",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Label",
    "sap/m/Token",
    "sap/m/SearchField",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/PDFViewer",
    "sap/base/security/URLListValidator",
    "ws/fi/xjoa/app/utils/Validator"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, FileUtil,
        JSONModel, Filter, FilterOperator, TypeString,
        UIColumn,
        MColumn, ColumnListItem, Label, Token, SearchField, MessageToast, MessageBox, PDFViewer,
        URLListValidator,
        Validator) {
        "use strict";

        return Controller.extend("ws.fi.xjoa.app.controller.Main", {
            
            /* =========================================================== */
            /* lifecycle methods                                           */
            /* =========================================================== */

            /**
             * Called when the worklist controller is instantiated.
             * @public
             */
             onInit: function () {
                URLListValidator.add("blob");

                var oComponent = this.getOwnerComponent();
                this._oConstant = oComponent ? oComponent.getModel("constant").getData() : undefined;
                this._oModel = oComponent.getModel();

                var oFormObject = JSON.parse(JSON.stringify(this._oConstant["FORM_OBJECT"])); //deep copy
                var oModel = new JSONModel(oFormObject);
                this.getView().setModel(oModel,"mdlForm");
                this._oFormMdl = this.getView().getModel("mdlForm");

                this._oSmartTable = this.byId("idMainTable");

                oComponent.getRouter().getRoute("RouteMain").attachPatternMatched(this._onXJOAMatched, this);
            },

            /**
             * Reset the Form Model everytime the page is loaded.
             * @private
             */
            _onXJOAMatched: function () {
                if (this._oFormMdl) this._oFormMdl.setData(JSON.parse(JSON.stringify(this._oConstant["FORM_OBJECT"])));
                if (this._oPDFURI) URL.revokeObjectURL(this._oPDFURI);

                this._setDefaultPstDate();
            },

            /**
             * Called when the worklist controller is destroyed.
             * @public
             */
            onExit: function () {
                URL.revokeObjectURL(this._oPDFURI);
            },

            /**
             * Sets the initial posting date which is 
             * end date of the month.
             * @public
             */
             _setDefaultPstDate: function() {
                var sCurrDate = new Date();
                var iCurrMonth = sCurrDate.getMonth();
                var iCurrYear = sCurrDate.getFullYear();
                var sLastDay = new Date(iCurrYear, iCurrMonth + 1, 0);
                this._oFormMdl.setProperty("/PostingDate", sLastDay);
                this._oFormMdl.setProperty("/DocumentDate", sLastDay);
            },

            /**
             * Returns the validator.
             * @public
             * @returns {object} returns the validator
             */
             _getValidator: function () {
                if (!this._oValidator) {
                    this._oValidator = new Validator();
                }
                return this._oValidator;
            },

            /**
             * Getter for the resource bundle.
             * @private
             * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
             */
            _getResourceBundle: function () {
                return this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            /**
             * Gets text from the resource bundle.
             * @private
             * @param {string} sResource name of the resource
             * @param {string[]} aParameters Array of strings, variables for dynamic content
             * @returns {string} the text
            */
            _getResourceText: function (sResource, aParameters) {
                return this._getResourceBundle().getText(sResource, aParameters);
            },

            /**
             * Generic method for getting model values as filters
             * @private
             * @returns {sap.ui.model.Filter} Filter object representing the filter
             */
             _getFilter: function(sProperty) {
                var aKeys = this._oFormMdl.getProperty("/" + sProperty);
                var aFilters = [];

                aKeys.forEach(function (sKey) {
                    if (!sKey.hasOwnProperty("keyField")) {
                        aFilters.push(new Filter(sProperty, FilterOperator.EQ, sKey));
                    }
                    else {
                        //for definitions
                        aFilters.push(new Filter(sKey.keyField, FilterOperator[sKey.operation], sKey.value1, sKey.value2));
                    }  
                });

                if (aFilters && aFilters.length > 0) {
                    if (aFilters.length == 1) {
                        return aFilters[0];
                    } else {
                        return new Filter({
                            filters: aFilters,
                            and: false
                        });
                    }
                }

                return undefined;
            },

            /**
             * Get the filters from Form
             * @private
             * @returns {Array} Array of Filters
             */
             _getFilters: function() {
                var aFilters = [];
                var aCompanyCodeFilter = this._getFilter(this._oConstant["COMPANY_CODE_PROP"]);
                if (aCompanyCodeFilter) aFilters.push(aCompanyCodeFilter);

                aFilters.push(new Filter("FiscalYear", FilterOperator.EQ, this._oFormMdl.getProperty("/" + this._oConstant["FISCAL_YEAR_PROP"])));
                aFilters.push(new Filter("Period", FilterOperator.EQ, this._oFormMdl.getProperty("/" + this._oConstant["FISCAL_PERIOD_PROP"])));
                aFilters.push(new Filter("FICODocument", FilterOperator.EQ, this._oFormMdl.getProperty("/" + this._oConstant["POSTING_TYPE_PROP"])));

                if (this._oFormMdl.getProperty("/Simulate") === true) {
                    var bReport = this._oFormMdl.getProperty("/" + this._oConstant["REPORT_PROP"]);
                    if (bReport === true) {
                        aFilters.push(new Filter("Test", FilterOperator.EQ, false));
                    }
                    else {
                        aFilters.push(new Filter("Test", FilterOperator.EQ, true));
                    }
                    aFilters.push(new Filter("Report", FilterOperator.EQ, this._oFormMdl.getProperty("/" + this._oConstant["REPORT_PROP"])));
                }
                else {
                    aFilters.push(new Filter("PostingDate", FilterOperator.EQ, this._oFormMdl.getProperty("/" + this._oConstant["POSTING_DATE_PROP"])));
                    aFilters.push(new Filter("DocumentDate", FilterOperator.EQ, this._oFormMdl.getProperty("/" + this._oConstant["DOCUMENT_DATE_PROP"])));
                    aFilters.push(new Filter("Test", FilterOperator.EQ, false));
                    aFilters.push(new Filter("Report", FilterOperator.EQ, false));
                }

                return aFilters;
            },

            /**
             * Handles when user selects the Value Help for the multi-input
             * @param {sap.ui.base.Event} oEvent from the multi-input
             * @public
             */
            onValueHelpRequested: function(oEvent) {
                this._oMultiInput = oEvent.getSource();
                var sTitle = this._oMultiInput.getLabels()[0].getText();
                this.sCurrMultiInput = sTitle.replace(/\s+/g, '');
                this._oBasicSearchField = new SearchField();
                if (!this.pDialog) {
                    this.pDialog = this.loadFragment({
                        name: "ws.fi.xjoa.app.view.fragments.CompanyCodeVH"
                    });
                }
                this.pDialog.then(function(oDialog) {
                    var oFilterBar = oDialog.getFilterBar();
                    this._oVHD = oDialog;
                    // Initialise the dialog with model only the first time. Then only open it
                    if (this._bDialogInitialized) {
                        // Re-set the tokens from the input and update the table
                        oDialog.setTokens([]);
                        oDialog.setTokens(this._oMultiInput.getTokens());
                        oDialog.update();
    
                        oDialog.open();
                        return;
                    }
                    this.getView().addDependent(oDialog);

                    oDialog.setRangeKeyFields([{
                        label: "Company Code",
                        key: "CompanyCode",
                        type: "string",
                        typeInstance: new TypeString({}, {
                            maxLength: 7
                        })
                    }]);
    
                    // Set Basic Search for FilterBar
                    oFilterBar.setFilterBarExpanded(false);
                    oFilterBar.setBasicSearch(this._oBasicSearchField);
    
                    // Trigger filter bar search when the basic search is fired
                    this._oBasicSearchField.attachSearch(function() {
                        oFilterBar.search();
                    });
    
                    oDialog.getTableAsync().then(function (oTable) {
    
                        oTable.setModel(this.oProductsModel);
    
                        // For Desktop and tabled the default table is sap.ui.table.Table
                        if (oTable.bindRows) {
                            // Bind rows to the ODataModel and add columns
                            oTable.bindAggregation("rows", {
                                path: "/I_CompanyCode",
                                events: {
                                    dataReceived: function() {
                                        oDialog.update();
                                    }
                                }
                            });
                            oTable.addColumn(new UIColumn({label: "Company Code", template: "CompanyCode"}));
                            oTable.addColumn(new UIColumn({label: "Company Name", template: "CompanyCodeName"}));
                        }
    
                        // For Mobile the default table is sap.m.Table
                        if (oTable.bindItems) {
                            // Bind items to the ODataModel and add columns
                            oTable.bindAggregation("items", {
                                path: "/I_CompanyCode",
                                template: new ColumnListItem({
                                    cells: [new Label({text: "{CompanyCode}"}), new Label({text: "{CompanyCode}"})]
                                }),
                                events: {
                                    dataReceived: function() {
                                        oDialog.update();
                                    }
                                }
                            });
                            oTable.addColumn(new MColumn({header: new Label({text: "Company Code"})}));
                            oTable.addColumn(new MColumn({header: new Label({text: "Company Name"})}));
                        }
                        oDialog.update();
                    }.bind(this));
    
                    oDialog.setTokens(this._oMultiInput.getTokens());
    
                    // set flag that the dialog is initialized
                    this._bDialogInitialized = true;
                    oDialog.open();
                }.bind(this));
            },
    
            /**
             * Called to set the tokens and close the Value Help dialog.
             * @param {sap.ui.base.Event} oEvent from the ok button
             * @public
             */
             onValueHelpOkPress: function (oEvent) {
                var aTokens = oEvent.getParameter("tokens");
                this._oMultiInput.setTokens(aTokens);
                var sTitle = oEvent.getSource().getTitle().replace(/\s+/g, '');
                var aKeys = [];
                aTokens.map((oToken) => { 
                    if (oToken.data("range") === null) {
                        aKeys.push(oToken.getKey()); 
                    }
                    else {
                        oToken.data("range").key = oToken.getKey();
                        aKeys.push(oToken.data("range")); 
                    }
                });
                this._oFormMdl.setProperty("/" + sTitle, aKeys);

                this._oVHD.close();
            },

            /**
             * Called to close the Value Help dialog.
             * @public
             */
            onValueHelpCancelPress: function () {
                this._oVHD.close();
            },

            /**
             * Handles when user selects the Value Help for 
             * @param {sap.ui.base.Event} oEvent from the multi-input
             * @public
             */
            onMultipleConditionsVHRequested: function(oEvent) {
                this._oMultipleConditionsInput = oEvent.getSource();
                if (!this.pMultipleConditionsDialog) {
                    this.pMultipleConditionsDialog = this.loadFragment({
                        name: "ws.fi.xjoa.app.view.fragments.DocumentNoVH"
                    });
                }
                this.pMultipleConditionsDialog.then(function(oMultipleConditionsDialog) {
                    if (this._bMultipleConditionsInitialized) {
                        oMultipleConditionsDialog.setTokens([]);
                        oMultipleConditionsDialog.setTokens(this._oMultipleConditionsInput.getTokens());
                        oMultipleConditionsDialog.update();

                        oMultipleConditionsDialog.open();
                        return;
                    }
                    this._oMultipleConditionsDialog = oMultipleConditionsDialog;
                    this.getView().addDependent(oMultipleConditionsDialog);
                    oMultipleConditionsDialog.setRangeKeyFields([{
                        label: "Document No",
                        key: "FIDocumentNumber",
                        type: "string",
                        typeInstance: new TypeString({}, {
                            maxLength: 7
                        })
                    }]);
    
                    oMultipleConditionsDialog.setTokens(this._oMultipleConditionsInput.getTokens());
                    this._bMultipleConditionsInitialized = true;
                    oMultipleConditionsDialog.open();
                }.bind(this));
            },

            /**
             * Called to set the conditions as tokens and close the Value Help dialog.
             * @param {sap.ui.base.Event} oEvent from the ok button
             * @public
             */
            onMultipleConditionsValueHelpOkPress: function (oEvent) {
                var aTokens = oEvent.getParameter("tokens");
                this._oMultipleConditionsInput.setTokens(aTokens);
                this._oFormMdl.setProperty("/FIDocumentNumber", aTokens);    
                this._oMultipleConditionsDialog.close();
            },

             /**
             * Called to close the Value Help dialog for Document No.
             * @public
             */
            onMultipleConditionsCancelPress: function () {
                this._oMultipleConditionsDialog.close();
            },

            /**
             * Handles when user uses the search functionality 
             * from the Value Help Dialog 
             * @param {sap.ui.base.Event} oEvent from the ok button
             * @public
             */
             onSearchforVH: function (oEvent) {
                var sSearchQuery = this._oBasicSearchField.getValue(),
                    aSelectionSet = oEvent.getParameter("selectionSet"),
                    aFilters = aSelectionSet && aSelectionSet.reduce(function (aResult, oControl) {
                        if (oControl.getValue()) {
                            aResult.push(new Filter({
                                path: oControl.getName(),
                                operator: FilterOperator.Contains,
                                value1: oControl.getValue()
                            }));
                        }

                        return aResult;
                    }, []);

                aFilters.push(new Filter({
                    filters: [
                        new Filter({ path: this.sCurrMultiInput, operator: FilterOperator.Contains, value1: sSearchQuery })
                    ],
                    and: false
                }));

                this._filterTableVH(new Filter({
                    filters: aFilters,
                    and: true
                }));
            },

            /**
             * Sets the filters on the Value Help Dialog Table
             * @private
             */
             _filterTableVH: function (oFilter) {
                var oVHD = this._oVHD;
                oVHD.getTableAsync().then(function (oTable) {
                    if (oTable.bindRows) {
                        oTable.getBinding("rows").filter(oFilter);
                    }
                    if (oTable.bindItems) {
                        oTable.getBinding("items").filter(oFilter);
                    }
                    oVHD.update();
                });
            },

            /**
             * Update stored fields if it has been removed.
             * @public
             * @param {sap.ui.base.Event} oEvent from the multiinput
             */
            onUpdateTokens: function (oEvent) {
                //Always selecting one
                var oToken = oEvent.getParameter("removedTokens")[0];

                var oMultiInput = oEvent.getSource();
                var oProperties = {};
                oProperties[this._oConstant["COMPANY_CODE_PROP"]] = this._oConstant["COMPANY_CODE_PROP"];
                oProperties[this._oConstant["DOCUMENT_NO_PROP"]] = this._oConstant["DOCUMENT_NO_PROP"];

                var sProperty = oProperties[oMultiInput.getName()];
                if (oEvent.getParameter("type") === "removed") {
                    var iIndex;
                    var aKeys = this._oFormMdl.getProperty("/" + sProperty);
                    if (oToken.data("range") === null) {
                        iIndex = aKeys.indexOf(oToken.getKey());
                    }
                    else {
                        var oDialog;
                        iIndex = aKeys.findIndex(object => { return object.key === oToken.getKey()});
                        if (sProperty === this._oConstant["COMPANY_CODE_PROP"]) {
                            oDialog = this._oVHD;
                        }
                        else {
                            oDialog = this._oMultipleConditionsDialog;
                        }

                        if (oDialog &&
                            oDialog._oFilterPanel &&
                            oDialog._oFilterPanel._oConditionPanel) oDialog._oFilterPanel._oConditionPanel.removeCondition(oToken.getKey().replace("range", "condition"));
                    }
                    if (iIndex >= 0) aKeys.splice(iIndex, 1);
                }
            },

            /**
             * Add selected item from suggestions as a token
             * @public
             * @param {sap.ui.base.Event} oEvent
             */
             onSuggestedItemSelected: function (oEvent) {
                var oMultiInput = oEvent.getSource();
                var sInputName = oMultiInput.getName();
                var oItem = oEvent.getParameter("selectedRow");
                var aTokens = oMultiInput.getTokens();
                var oKeysAndTexts = this._oConstant["FIELDS"];

                if (oItem) {
                    var oContext = oItem.getBindingContext();
                    var sKey = oContext.getProperty(oKeysAndTexts[sInputName].key);
                    var aKeys = this._oFormMdl.getProperty("/" + sInputName);

                    if (aKeys.includes(sKey) === false) {
                        aTokens.push(new Token({
                            key: sKey,
                            text: oContext.getProperty(oKeysAndTexts[sInputName].text) + " (" + sKey + ")"
                        }));
    
                        oMultiInput.setTokens(aTokens);
                        aKeys.push(sKey);
                    }
                }
            },


            /**
             * Updates the selected Posting Type.
             * @public
             * @param {sap.ui.base.Event} oEvent from the radtiobutton group
             */
            selectPostType: function(oEvent) {
                var sRadioVal;
                var iIdx = oEvent.getParameter("selectedIndex");

                if (iIdx > 0) {
                    sRadioVal = "CO";
                }
                else {
                    sRadioVal = "FI";
                }

                this._oFormMdl.setProperty("/FICODocument", sRadioVal);
            },

            
            /**
             * Generates the Test Run of Report.
             * @public
             */
             onSimulateForm: function () {
                if (!this._getValidator().validate(this.byId("idMainForm"))) {
                    MessageToast.show(this._getResourceText("validationMessage"), {
                        closeOnBrowserNavigation: false
                    });
                    return;
                }

                this._oFormMdl.setProperty("/Simulate", true);
                this._oSmartTable.rebindTable();
            },

            /**
             * Clears inputs in the form.
             * @public
             */
             onClearForm: function () {
                this._clearControl("idMulInpCompCode", this._oConstant["COMPANY_CODE_PROP"]);
                this._clearControl("idComboBxFisYr", this._oConstant["FISCAL_YEAR_PROP"]);
                this._clearControl("idComboBxFisYrPrd", this._oConstant["FISCAL_PERIOD_PROP"]);
                this._clearControl("idRBGPostType", this._oConstant["POSTING_TYPE_PROP"]);
                this._clearControl("idCBRprtOnly", this._oConstant["REPORT_PROP"]);
                this._clearControl("idMulInpDocNo", this._oConstant["DOCUMENT_NO_PROP"]);
                this._setDefaultPstDate();

                if (this._oVHD &&
                    this._oVHD._oFilterPanel &&
                    this._oVHD._oFilterPanel._oConditionPanel) this._oVHD._oFilterPanel._oConditionPanel.setConditions([]);
                
                if (this._oMultipleConditionsDialog &&
                    this._oMultipleConditionsDialog._oFilterPanel &&
                    this._oMultipleConditionsDialog._oFilterPanel._oConditionPanel) this._oMultipleConditionsDialog._oFilterPanel._oConditionPanel.setConditions([]);
            },

            /**
             * Removes data from a field
             * @private
             */
             _clearControl: function (sId, sProperty) {
                var oControl = this.byId(sId);

                switch (oControl.getMetadata().getName()) {
                    case "sap.m.Input":
                        oControl.setValue("");
                        this._oFormMdl.setProperty("/" + sProperty, "");
                        break;
                    case "sap.m.RadioButtonGroup":
                        oControl.setSelectedIndex(0);
                        this._oFormMdl.setProperty("/" + sProperty, "FI");
                        break;
                    case "sap.m.ComboBox":
                        oControl.setSelectedKey("");
                        this._oFormMdl.setProperty("/" + sProperty, "");
                        break;
                    case "sap.m.MultiComboBox":
                        oControl.setSelectedKeys([]);
                        this._oFormMdl.setProperty("/" + sProperty, []);
                        break;
                    case "sap.m.MultiInput":
                        oControl.removeAllTokens();
                        this._oFormMdl.setProperty("/" + sProperty, []);
                        break;
                    case "sap.m.CheckBox":
                        this._oFormMdl.setProperty("/" + sProperty, false);
                        break;
                }
            },

            /**
             * Binds the latest data to the Smart Filter Table.
             * @public
             * @param {sap.ui.base.Event} oEvent from the smart filter table
             */
             onBeforeRebindTable: function(oEvent) {
                var oBindingParams = oEvent.getParameter("bindingParams");
                oBindingParams.filters = this._getFilters();

                this._oFormMdl.setProperty("/Busy", true);
                this._oFormMdl.setProperty("/ShowFooter", false);
                this._oFormMdl.setProperty("/PrintOut", false);
                this._addBindingListener(oBindingParams, "dataReceived", this._onDataReceived.bind(this));
            },

            /**
             * Handles dataReceived event of SmartTable
             * @private
             * @param {sap.ui.base.Event} oEvent
             */
            _onDataReceived: function (oEvent) {
                var arrData = oEvent.getParameter("data")["results"];
                var iDataLength = arrData.length;
                var arrDocNum = [];
                this._oFormMdl.setProperty("/Busy", false);
                
                if(this._oFormMdl.getProperty("/Simulate") && !this._oFormMdl.getProperty("/Report") && iDataLength > 0) {
                    this._oFormMdl.setProperty("/ShowFooter", true);
                } else if (iDataLength > 0) {
                    var arrUniqueEntries = [];
                    arrData.forEach((oResult) => {
                        if(arrUniqueEntries.indexOf(oResult.SenderPostedDocNum) < 0) {
                            arrUniqueEntries.push(oResult.SenderPostedDocNum);
                            arrDocNum.push({DocumentNumber:oResult.SenderPostedDocNum});
                        }
                    });
                    this._oFormMdl.setProperty("/PrintOut", true);
                }

                this._oFormMdl.setProperty("/SenderPostedDocNum", arrDocNum);
            },

            /**
             * Posts the records that are selected.
             * @public
             */
             onConfirmPost: function() {
                MessageBox.confirm(this._getResourceText("confirmPosting"), {
                    onClose: (oAction) => {
                        if (oAction === MessageBox.Action.YES) {
                            this._oFormMdl.setProperty("/Simulate", false);
                            this._oSmartTable.rebindTable();
                        }
                    },
                    actions: [
                        MessageBox.Action.YES,
                        MessageBox.Action.NO
                    ],
                    emphasizedAction: MessageBox.Action.NO
                });
            },

            onPDFDisplay: function () {
                var aFilters = [];
                

                this._getFilters().forEach((oFilter) => {
                    var sPath = oFilter.getPath();

                    if (oFilter && !sPath) { //means it is possibly a range
                        var aInFilters = oFilter.getFilters();
                        if (aInFilters && aInFilters.length > 0) {
                            sPath = aInFilters[0].getPath();
                        }
                    }

                    switch (sPath) {
                        case "CompanyCode":
                        case "FiscalYear":
                        case "Period":
                            aFilters.push(oFilter);
                            break;
                    }
                });

                var aDocumentNoFilter = this._getFilter(this._oConstant["DOCUMENT_NO_PROP"]);
                if (aDocumentNoFilter) aFilters.push(aDocumentNoFilter);

                if (aFilters && aFilters.length > 0) {
                    this._oFormMdl.setProperty("/Busy", true);

                    this._oModel.read("/PrintOut", {
                        filters: aFilters,
                        success: (oData) => {
                            if (oData && oData.results && oData.results.length > 0) {
                                this._displayPDF(oData.results[0]); //expecting only a single response
                                this._oFormMdl.setProperty("/Busy", false);
                            }
                        },
                        error: (oError) => {
                            this._oFormMdl.setProperty("/Busy", false);
                            MessageBox.error(this._getResourceText("pdfErrMessage"), {
                                details: oError
                            });
                        }
                    });
                }
            },

            /**
             * Display generated PDF from backend.
             * @private
             * @param {Object} oData Data representing PDF response from backend
             */
            _displayPDF: function (oData) {
                var oPDFCode = null;
                var byteArray = null;
                var arrFileName = this._getFileNameArray(oData.FileName);

                if (oData.PDF) {
                    oPDFCode = window.atob(oData.PDF);
                    byteArray = new Uint8Array(oPDFCode.length);

                    for(var i=0; i<oPDFCode.length; i++) {
                        byteArray[i] = oPDFCode.charCodeAt(i);
                    }

                    var oBlob = new Blob([byteArray.buffer], { type: oData.MimeType } );
                    if (this._oPDFURI) URL.revokeObjectURL(this._oPDFURI);
                    this._oPDFURI = URL.createObjectURL(oBlob);

                    if (!this._oPDFViewer) this._oPDFViewer = new PDFViewer({ width: "auto" });
                    this._oPDFViewer.setSource(this._oPDFURI);
                    this._oPDFViewer.setErrorPlaceholderMessage(oData.Message);

                    this._oPDFViewer.downloadPDF = () => {
                        FileUtil.save(
                            byteArray.buffer,
                            arrFileName[0],
                            arrFileName[1],
                            oData.MimeType
                        );
                    };

                    this._oPDFViewer.open();
                } else {
                    MessageBox.warning(oData.Message);
                }
            },

            /**
             * Splits a filename string as an array
             * @private
             * @param {string} sFileName Filename string with extension
             * @returns {Array} Array of containing file name [0] and extension [1]
             */
            _getFileNameArray: function (sFileName) {
                var arrFileNameParts = ["Dummy", "pdf"];
                var iExtSeparator = sFileName.lastIndexOf(".");

                if (iExtSeparator > 0) { //dot is not at the beginning of the string
                    arrFileNameParts[0] = (sFileName.substring(0, iExtSeparator)); //FileName
                    arrFileNameParts[1] = (sFileName.substring((iExtSeparator + 1), sFileName.length)); //Extension
                }

                return arrFileNameParts;
            },

            /**
             * Event handler for navigating back.
             * Navigate back in the browser history
             * @public
             */
            onNavBack: function () {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            },

            /**
             * Formatter function for removing leading zeroes
             * @public
             * @param sNum String input to remove leading zeroes
             * @returns Number without leading zeroes
             */
            removeLeadingZeroes: function (sNum) {
                var iNum = parseInt(sNum);

                if (iNum && !isNaN(iNum)) {
                    return iNum + "";
                }

                return sNum;
            },

            /**
             * Event handler for data Received/Requested post sapui5 1.56.
             * Referenced from https://blogs.sap.com/2019/11/04/handle-datareceived-event-in-smart-table-after-version-1.56-in-sapui5/
             * @private
             * @param {Object} oBindingInfo Binding information from calling event
             * @param {string} sEventName Name of Event to Handle
             * @param {function} fHandler Function to execute if the event is triggered
             */
            _addBindingListener: function (oBindingInfo, sEventName, fHandler) {
                oBindingInfo.events = oBindingInfo.events || {};

                if (!oBindingInfo.events[sEventName]) {
                    oBindingInfo.events[sEventName] = fHandler;
                } else {
                    // Wrap the event handler of the other party to add our handler.
                    var fOriginalHandler = oBindingInfo.events[sEventName];
                    oBindingInfo.events[sEventName] = function() {
                        fHandler.apply(this, arguments);
                        fOriginalHandler.apply(this, arguments);
                    };
                }
            }

        });
    });
