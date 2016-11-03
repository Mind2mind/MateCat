QaCheckBlacklist = {} ;

QaCheckBlacklist.enabled = function() {
    return config.qa_check_blacklist_enabled ;
}

// COMMON EVENTS
if (QaCheckBlacklist.enabled() )
(function($, UI, QaCheckBlacklist, undefined) {

    var globalReceived = false ;
    var globalWarnings ;

    function blacklistItemClick(e) {
        // TODO: investigate the need for this. Click on .blacklistItem clears up the #outer
        // this function forwards the click to the containing editarea.
        e.preventDefault();
        e.stopPropagation();
        $(e.target).closest(UI.targetContainerSelector()).click();
        console.log('blacklist item clicked');
    }

    function addTip( editarea ) {
        $('.blacklistItem', editarea).powerTip({
            placement : 's'
        });
        $('.blacklistItem', editarea).data({ 'powertipjq' : $('<div class="blacklistTooltip">Blacklisted term</div>') });
    }


    var currentRange = null;

    function analyze( node, term ) {
        var escaped = escapeRegExp( term );
        var expForSplit = new RegExp('\\b' + escaped + '\\b',"g");
        var expForReplace = new RegExp('\\b(' + escaped + ')\\b',"g");


        // is the current node matching the one with caret?

        if ( node === currentRange.endContainer ) {
            console.log(' matched node ', node );

            // first off, see if the node is already wrapper and remove the parent
            removeParentAndPreserveCaret('.blacklistItem');

            // then split the text we want to replace stands in its own text node

            var matches = expForReplace.exec( node.textContent );
            var originalNode = node ;

            $.each( matches, function() {
                var secondHalf = currentRange.endContainer.split( this.index );
                var firstHalf = secondHalf.previousSibling ;

                console.log('splitted',  firstHalf, secondHalf );

                // create a number of text nodes equal to the match

            });

        }

        else {
            console.log(  node ) ;

            // caret is not in this node
            // just remove all the blacklist spans and replay the replace

            newText = node.textContent.replace(
                expForReplace , '<span class="blacklistItem">$1</span>'
            );

            if ( $(node).parent().hasClass('blacklistItem')) {
                $(node).unwrap();
            }

            $(node).replaceWith( newText );

        }

    }

    function digInto( node, term ) {
        console.log(' digInto ', node  );
        node.contents().each( function() {
            switch( this.nodeType ) {
                case 3:
                    analyze( this,  term );
                    break;
                case 1:
                    digInto( $(this), term );
                    break ;
                default:
                    console.log('not interested in node type', this.nodeType );
            };
        });
    }


    /**
     * Removes parent from a node where the caret is, preserving caret position.
     *
     * @param selector
     */
    function removeParentAndPreserveCaret(selector) {
        var r = window.getSelection().getRangeAt(0);
        var offset = r.endOffset ;

        var parent = $(r.endContainer).parent( selector ) ;
        if ( parent.length === 0 ) {
            return ;
        }

        var newNode = document.createTextNode(r.endContainer.textContent);
        var replaced = parent.replaceWith( newNode );
        var range = document.createRange();

        range.setStart(newNode, offset);
        range.setEnd(newNode, offset);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    /**
     *
     * @param editarea
     * @param matched_words
     */
    function updateBlacklistItemsInSegment( editarea, matched_words ) {
        console.debug('updateBlacklistItemsInSegment');

        // TODO: is there's a selected text, then exit, trigger this later

        currentRange = window.getSelection().getRangeAt(0);

        $.each( matched_words, function( index, term ) {
            digInto( editarea, term );
        });

        // remove all previous tags
        // this should not replace carets
        //
        // editarea.find('.blacklistItem').each(function(index)  {
        //     $(this).replaceWith( this.childNodes );
        // });


        // save caret position
        //
        // find all text nodes of the editarea
        //

        //

        // editarea[0].normalize() ;

        // var newHTML = editarea.html() ;

        // $(matched_words).each(function(index, value) {
        //     value = escapeRegExp( value );
        //     var re = new RegExp('\\b(' + value + ')\\b',"g");
        //     newHTML = newHTML.replace(
        //         re , '<span class="blacklistItem">$1</span>'
        //     );
        // });

        // var range = document.createRange();
        // var sel = window.getSelection();

        // editarea.html( newHTML );

        // if ( editarea.find('.undoCursorPlaceholder').length ) {
        //     setCursorPosition( editarea.find('.undoCursorPlaceholder')[0] );
        // }

        UI.lockTags( editarea );

        $('.blacklistItem', editarea).on('click', blacklistItemClick);

        addTip( editarea ) ;
    }


    function renderGlobalWarnings() {
        if ( !globalWarnings ) return ;

        var mapped = {} ;

        // group by segment id
        var segments_to_refresh = _.each( globalWarnings.matches, function ( item ) {
            mapped[ item.id_segment ] ? null : mapped[ item.id_segment ] = []  ;
            mapped[ item.id_segment ].push( { severity: item.severity, match: item.data.match } );
        });

        _.each(Object.keys( mapped ) , function(item, index) {
            var segment = UI.Segment.find( item );
            if ( !segment || segment.isReadonly() ) return ;

            var matched_words = _.chain( mapped[item]).map( function( match ) {
                return match.match ;
            }).uniq().value() ;

            var editarea = segment.el.find(  UI.targetContainerSelector() ) ;
            updateBlacklistItemsInSegment( editarea, matched_words ) ;
        });

        globalReceived = true ;
    }

    $( window ).on( 'segmentsAdded', function ( e ) {
        globalReceived = false ;
        renderGlobalWarnings() ;
    });

    $(document).on('getWarning:global:success', function(e, data) {
        if ( globalReceived ) {
            return ;
        }

        globalWarnings = data.resp.data.blacklist ;

        renderGlobalWarnings() ;
    });

    $(document).on('getWarning:local:success', function(e, data) {
        if ( !data.resp.data.blacklist || data.segment.isReadonly() ) {
            // No blacklist data contained in response, skip it
            // or segment is readonly, skip
            return ;
        }

        var matched_words = Object.keys( data.resp.data.blacklist.matches )
        var editarea = data.segment.el.find( UI.targetContainerSelector() ) ;

        // updateBlacklistItemsInSegment( editarea, matched_words );
    });

    $.extend( QaCheckBlacklist, {
        update : updateBlacklistItemsInSegment
    });

})(jQuery, UI, QaCheckBlacklist );




