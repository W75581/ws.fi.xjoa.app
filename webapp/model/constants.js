sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";

    var sNoTimePattern = "yyyy-MM-dd'T00:00:00'";

    return {
        MAIN_ENTITY_SET: "Adjustment",
        MAIN_ENTITY_TYPE: "AdjustmentType",
        EXPORT_FILE_NAME: "XJOA Tax Adjustment Items.xlsx",
        BASE_YEAR: new Date().getUTCFullYear() + "",
        VAR_DATE_FORMAT: DateFormat.getDateInstance({pattern : "yyyy-MM-dd'T'hh:mm:ss.SSS'Z'", UTC: true }),
        BASE_DATE_FORMAT: DateFormat.getDateInstance({pattern : sNoTimePattern, UTC: true }),
        NON_UTC_FORMAT: DateFormat.getDateInstance({pattern : sNoTimePattern }),
        FI_KEY: "FI",
        CO_KEY: "CO",
        FORM_OBJECT: {
            CompanyCode: [],
            PostingType: "FI",
            PostingTypes: [],
            FIDocumentNumber: [],
            SenderPostedDocNum: [],
            Report: false,
            PrintOut: false,
            Simulate: false,
            Rows: [],
            DocumentDate: null,
            PostingDate: null,
            FiltersSnappedText: "",
            SearchEnabled: true,
            ExportEnabled: false,
            Posting: false,
            ItemsSelected: false,
            ShowFooter: false,
            Busy: false
        }
    };
});