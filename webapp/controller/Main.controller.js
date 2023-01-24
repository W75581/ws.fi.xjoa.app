sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/m/ColumnListItem',
    'sap/m/Label',
    'sap/m/Token',
    'sap/m/SearchField',
    'sap/m/MessageToast',
    'sap/ui/table/Column',
	'sap/m/Column',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'ws/fi/xjoa/app/utils/Validator'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, ColumnListItem, Label, Token, SearchField, MessageToast, UIColumn, MColumn, Filter, FilterOperator, Validator) {
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
                this._oConstant = this.getOwnerComponent() ? this.getOwnerComponent().getModel("constant").getData() : undefined;
                this._oModel = this.getOwnerComponent().getModel();

                var oFormObject = this._oConstant["FORM_OBJECT"];
                var oModel = new sap.ui.model.json.JSONModel(oFormObject);
                this.getView().setModel(oModel,"mdlForm");
                this._oFormMdl = this.getView().getModel("mdlForm");
                this._bSimulate = true;
                this._setDefaultPstDate();
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
             * Gets smart table instance
             * @private
             */
             _getSmartTableById: function () {
                return this.getView().byId("idMainTable");
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
                    aFilters.push(new Filter(sProperty, FilterOperator.EQ, sKey));
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

                var aPeriodKeys = this._oFormMdl.getProperty("/" + this._oConstant["FISCAL_PERIOD_PROP"]);
                aPeriodKeys.forEach((value) => {
                    aFilters.push(new Filter("Period", FilterOperator.EQ, value));
                });

                aFilters.push(new Filter("PostingDate", FilterOperator.EQ, this._oFormMdl.getProperty("/" + this._oConstant["POSTING_DATE_PROP"])));
                aFilters.push(new Filter("DocumentDate", FilterOperator.EQ, this._oFormMdl.getProperty("/" + this._oConstant["DOCUMENT_DATE_PROP"])));
                aFilters.push(new Filter("FICODocument", FilterOperator.EQ, this._oFormMdl.getProperty("/" + this._oConstant["POSTING_TYPE_PROP"])));

                // aFilters.push(new Filter("FIDocumentNumber", FilterOperator.Contains, this._oFormMdl.getProperty("/" + this._oConstant["DOCUMENT_NO_PROP"])));

                if (this._bSimulate === true) {
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
                aTokens.map((oToken) => { aKeys.push(oToken.getKey()); });
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

                var sProperty = oProperties[oMultiInput.getName()];
                if (oEvent.getParameter("type") === "removed") {
                    var aKeys = this._oFormMdl.getProperty("/" + sProperty);
                    var iIndex = aKeys.indexOf(oToken.getKey());
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
             * Apply Fiscal Year to Fiscal Year Period as filter.
             * @public
             * @param {sap.ui.base.Event} oEvent from the combobox
             */
            onSelFiscalYear: function(oEvent) {
                var aFilters = [];
                var sFilterValue = oEvent.getSource().getSelectedKey();
                var oFisYrPrd = this.getView().byId("idComboBxFisYrPrd");
                var oBinding = oFisYrPrd.getBinding("items");
                if (sFilterValue){
                    aFilters.push( new Filter("FiscalYear", FilterOperator.EQ, sFilterValue) );
                }
                oBinding.filter(aFilters, sap.ui.model.FilterType.Application);
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
                if (!this._getValidator().validate(this.getView().byId("idMainForm"))) {
                    MessageToast.show(this._getResourceText("validationMessage"), {
                        closeOnBrowserNavigation: false
                    });
                    return;
                }

                this._bSimulate = true;
                this._getSmartTableById().rebindTable();
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
                this._clearControl("idInpDocNo", this._oConstant["DOCUMENT_NO_PROP"]);
                this._setDefaultPstDate();
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
                }
            },

            /**
             * Binds the latest data to the Smart Filter Table.
             * @public
             * @param {sap.ui.base.Event} oEvent from the smart filter table
             */
             onBeforeRebindTable: function(oEvent) {
                this._getSmartTableById().getTable().removeSelections();
                var oBindingParams = oEvent.getParameter("bindingParams");
                var aFilters = this._getFilters();
                oBindingParams.filters = aFilters;
            },

            /**
             * Posts the records that are selected.
             * @public
             */
             onConfirmPost: function() {
                this._bSimulate = false;
                var aItems = this._getSmartTableById().getTable().getItems();
                
                if (aItems.length < 1) {
                    MessageToast.show(this._getResourceText("saveErrMessage"));
                    return;
                }

                this._getSmartTableById().rebindTable();
            },

            /**
             * Event handler for navigating back.
             * Navigate back in the browser history
             * @public
             */
            onNavBack: function () {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            }
        });
    });
