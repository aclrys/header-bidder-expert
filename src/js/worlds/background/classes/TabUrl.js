'use strict';

import $ from 'jquery';

/**
 * Listener of tab url refreshes - i.e. when a tab starts loading or moves away from a url
 */
export default class TabUrl {
    constructor(chromeTabs, chromeWebNavigation) {
        this._chromeTabs = chromeTabs;
        this._chromeWebNavigation = chromeWebNavigation;
    }

    /**
     * Constants for events generated by this class
     */
    static get EV_TAB_START() {
        return 'tab_start';
    }
    static get EV_TAB_END() {
        return 'tab_end';
    }
    static get EV_DOM() {
        return 'dom';
    }
    static get EV_COMPLETED() {
        return 'completed';
    }

    /**
     * Start this object
     */
    run() {
        // For tab start - listen to navigation event, rather than to tab.onCreated or tab.onUpdated.
        // The navigation event captures start of pre-rendering a page in an invisible tab,
        // which is not signalled via tab events. Also web navigation event is not fired,
        // when just a hash part is changed in url, so we don't need to process such noise events.
        this._chromeWebNavigation.onBeforeNavigate.addListener(this._onNavigateToUrl.bind(this));
        this._chromeWebNavigation.onDOMContentLoaded.addListener(this._onDOMContentLoaded.bind(this));
        this._chromeWebNavigation.onCompleted.addListener(this._onCompleted.bind(this));

        this._chromeTabs.onRemoved.addListener(this._onTabRemoved.bind(this));
        this._chromeTabs.onReplaced.addListener(this._onTabReplaced.bind(this));
    }

    /**
     * A tab has been navigated to a different URL
     */
    _onNavigateToUrl(details) {
        const {tabId, url} = details;
        const tsm = Math.floor(details.timeStamp);

        // Capture only top frame events
        if (details.frameId) {
            return;
        }

        // Capture events only with a valid url
        if (!url) {
            return;
        }

        // Do not capture events for invalid tabs
        if (!tabId || (tabId == this._chromeTabs.TAB_ID_NONE)) {
            return;
        }

        $(this).trigger(TabUrl.EV_TAB_START, {tabId, url, tsm});
    }

    /**
     * A tab has been removed
     */
    _onTabRemoved(tabId, removeInfo) {
        if (!tabId || (tabId == this._chromeTabs.TAB_ID_NONE)) {
            return;
        }

        $(this).trigger(TabUrl.EV_TAB_END, {tabId: tabId});
    }

    /**
     * The browser was pre-rendering a url in an invisible tab, and now the browser has replaced an existing tab
     * with that invisible one. End the current tab's data frame.
     */
    _onTabReplaced(addedTabId, removedTabId) {
        if (!removedTabId || (removedTabId == this._chromeTabs.TAB_ID_NONE)) {
            return;
        }

        $(this).trigger(TabUrl.EV_TAB_END, {tabId: removedTabId});
    }

    /**
     * Dom content has finished loading
     */
    _onDOMContentLoaded(details) {
        // We should have a valid tab id
        if (!details.tabId || (details.tabId == this._chromeTabs.TAB_ID_NONE)) {
            return;
        }

        // This should not be one of the sub frames
        if (details.frameId) {
            return;
        }

        $(this).trigger(TabUrl.EV_DOM, {tabId: details.tabId, tsm: Math.floor(details.timeStamp)});
    }

    /**
     * Page has been completely loaded
     */
    _onCompleted(details) {
        // We should have a valid tab id
        if (!details.tabId || (details.tabId == this._chromeTabs.TAB_ID_NONE)) {
            return;
        }

        // This should not be one of the sub frames
        if (details.frameId) {
            return;
        }

        $(this).trigger(TabUrl.EV_COMPLETED, {tabId: details.tabId, tsm: Math.floor(details.timeStamp)});
    }
};