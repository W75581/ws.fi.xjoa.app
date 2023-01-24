sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "./constants"
], 
    /**
     * provide app-view type models (as in the first "V" in MVVC)
     * 
     * @param {typeof sap.ui.model.json.JSONModel} JSONModel
     * @param {typeof sap.ui.Device} Device
     * 
     * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
     */
    function (JSONModel, Device, constants) {
        "use strict";

        return {
            createDeviceModel: function () {
                var oModel = new JSONModel(Device);
                oModel.setDefaultBindingMode("OneWay");
                return oModel;
        },

            /**
                 * Convenience method for creating the model for constants
                 * @public
                 * @returns {sap.ui.model.json.JSONModel} the corresponding model
                 */
            createConstantModel: function () {
                var oModel = new JSONModel(constants);
                oModel.setDefaultBindingMode("OneWay");
                return oModel;
        }
    };
});