/*
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * TodoActions
 */

var AppDispatcher = require('../dispatcher/AppDispatcher');
var SegmentConstants = require('../constants/SegmentConstants');


var SegmentActions = {

    /**
     * @param segments
     * @param fid
     */
    renderSegments: function (segments, fid) {
        AppDispatcher.dispatch({
            actionType: SegmentConstants.RENDER_SEGMENTS,
            segments: segments,
            fid: fid
        });
    },

    splitSegments: function (oldSid, newSegments, splitAr, splitGroup, fid) {
        AppDispatcher.dispatch({
            actionType: SegmentConstants.SPLIT_SEGMENT,
            oldSid: oldSid,
            newSegments: newSegments,
            splitAr: splitAr,
            splitGroup: splitGroup,
            fid: fid
        });
    },
    highlightEditarea: function(sid) {
        AppDispatcher.dispatch({
            actionType: SegmentConstants.HIGHLIGHT_EDITAREA,
            id: sid
        });
    },

    /*replaceContent: function(sid, text) {
        AppDispatcher.dispatch({
            actionType: SegmentConstants.REPLACE_CONTENT,
            id: sid,
            text: text
        });
    }*/



};

module.exports = SegmentActions;