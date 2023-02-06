sap.ui.define([], function () {
    "use strict";
    return {
        "FORM_OBJECT": {
            "CompanyCode": [],
            "FICODocument": "FI",
            "FIDocumentNumber": [],
            "Report": false,
            "Busy": false,
            "PrintOut": false,
            "ShowFooter": false,
            "Simulate": false
        },
        "COMPANY_CODE_PROP": "CompanyCode",
        "COMPANY_CODE_TEXT": "CompanyCodeName",
        "FISCAL_YEAR_PROP": "FiscalYear",
        "FISCAL_PERIOD_PROP":"Period",
        "POSTING_TYPE_PROP": "FICODocument",
        "POSTING_DATE_PROP":"PostingDate",
        "DOCUMENT_DATE_PROP":"DocumentDate",
        "DOCUMENT_NO_PROP":"FIDocumentNumber",
        "REPORT_PROP": "Report",
        "CompanyCode": {
            "cols": [
                {
                    "label": "Company Code",
                    "template": "CompanyCode"
                },
                {
                    "label": "Company Code Name",
                    "template": "CompanyCodeName"
                }
            ]
        },
        "FIELDS": {
            "CompanyCode" : {
                "key": "CompanyCode",
                "text": "CompanyCodeName"
            }
        }
    };
});