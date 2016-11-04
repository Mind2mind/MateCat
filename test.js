

/** 
 * This class takes a dom node as input searches for the word applying a transformation funciton. 
 * If the node contains the cursor, the cursor is left in place during transformation. 
 *
 */

var Transformer = function( element ) { 
    var terms = null; 
    var term  = null ; 
    var callback = null; 
    var currentRange = null; 
    var selection = null; 
    var selector = null; 

    var that = this ; 

    this.element = element ;

    var escapeRegExp = function(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    var searchAndReplaceWord = function(node, term) { 
        // TODO: optimize
        // IF node matches any of the terms passed as input array and is already wrapped in 
        // a selector, the don't do anything. 
        if ( this.terms.indexOf( node.textContent.trim() ) > -1 && $(node).parent().hasClass( this.selector ) ) { 
            return ; 
        }

        // Remove any tag with our selector, if any. 
        if ( $(node).parent().hasClass( this.selector ) ) { 
            $(node).unwrap();
        }

        var escaped = escapeRegExp( term );
        var expForReplace = new RegExp('\\b(' + escaped + ')\\b',"g");

        newText = node.textContent.replace(
            expForReplace , '<span class="' + this.selector + '">$1</span>'
        );

        $(node).replaceWith( newText );
    }


    var transformNodeAndPreserveCursor = function(node, term) {
        var newNode = $('<span/>').addClass(this.selector) ;
        newNode.text( term );

        var offset ;
        var range = window.getSelection().getRangeAt(0);
        if ( range.endContainer == node ) {
            offset = range.endOffset ;
        }

        $(node).replaceWith( newNode );

        if ( offset ) {
            console.log('calling restoreCursor from transformNodeAndPreserveCursor', term); 
            restoreCursor( newNode[0].childNodes[0], offset ); 
        }
    };

    /** 
     *
     */
    var restoreCursor = function( node, offset ) { 

        if ( $(node).parents('body').length === 0 ) { 
            console.log('text node removed from tree', node, offset); 
            return ;
        }
        var range = document.createRange();
        range.setStart( node , offset );
        range.setEnd( node , offset );

        console.log('restoring position on node', node, offset ); 

        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange( range );
    }

    /**
     * This function finds the node where the cursor is, looks for the parent and 
     * if the parent is our TAG with selector, then unwrap preserving the cursor 
     * position. 
     *
     */
    var removeParentAndPreserveCursor = function( term ) {
        var r = window.getSelection().getRangeAt(0);

        // TODO: fix this selector
        var parent = $(r.endContainer).parent('.' + this.selector ) ;

        if ( parent.length === 0 ) {
            return ;
        }

        var savedOffset = r.endOffset ;
        var newNode = document.createTextNode(r.endContainer.textContent);

        parent.replaceWith( newNode );

        console.log('calling restoreCursor from removeParentAndPreserveCursor', term); 
        restoreCursor( newNode, savedOffset ); 
        return newNode ;
    }

    var startLooping = function() { 
        selection = window.getSelection(); 

        if ( selection.rangeCount === 0 ) { 
            // TODO: ingore if it's a selection, only consider caret position 
        }

        else { 
            this.currentRange = selection.getRangeAt(0); 
        }

        var that = this ; 
        $.each( this.terms, function(i, term) { 
            descend.call( that, that.element, term ); 
        }); 
    };

    /**
     * We enter in this function when we are sure to be in the same node 
     * that holds the cursor. 
     */
    var isolateCursor = function( node, term ) {
        // first off, see if the node is already wrapper and remove the parent

        if ( this.terms.indexOf( node.textContent.trim()  ) > -1 && $(node).parent().hasClass( this.selector ) ) { 
            // don't do anything in this case, already 
            return ; 
        } 

        var replaced = removeParentAndPreserveCursor.call(this,term);

        // if ( $(node).parent().hasClass( this.selector ) ) { 
        //     $(node).unwrap();
        // }

        if ( replaced ) {
        node = replaced ;
        }

        // then split the text we want to replace stands in its own text node
        var escaped = escapeRegExp( term );
        var matches =  [];
        var rightPart ; 
        var leftPart ; 
        var chunks = []; 

        var expForSplit = new RegExp('\\b' + escaped + '\\b',"g");
        while ((match = expForSplit.exec( node.textContent )) !== null) {
            matches.push( match );
        }

        // iterate matches inversely to isolate nodes
        for ( var i = matches.length -1 ; i > -1 ; i--) {
            var match = matches[i] ;

            if ( node.textContent == term ) {
                chunks.push( node );
                continue ; 
            }

            rightPart = node.splitText( match.index + term.length );
            if ( rightPart ) chunks.push( rightPart );

            rightPart = node.splitText( match.index );
            if ( rightPart ) chunks.push( rightPart );

            leftPart = node ;

        }

        if ( leftPart ) chunks.push( leftPart );

        // for each chunk we make a loop and
        chunks.reverse();

        var that = this ;
        $.each(chunks, function(index, node) {
            if ( node.textContent == term ) {
                transformNodeAndPreserveCursor.call(that, node, term);
            }
        });


        console.log( chunks ); 

        // ok now we splitted nodes 
    };

    var analyze = function(node, term) { 
        // is the current node matching the one with caret?

        if ( this.currentRange && node === this.currentRange.endContainer ) {
            isolateCursor.call( this, node, term ) ;
        } else { 
            searchAndReplaceWord.call( this, node, term );
        }

    }

    var descend = function(node, term) { 
        node[0].normalize(); 

        node.contents().each( function(index, node) {
            switch( this.nodeType ) {
              case 3: // TEXT
                analyze.call( that, node,  term );
                break;
              case 1: // TAG 
                descend.call( that, $(node), term );
                break ;
              default:
                console.log('not interested in node type', this.nodeType );
            };
        });
    }

    this.setSearch = function( str ) { 
        this.terms = str ; 
    }

    this.setFunction = function( callback ) { 
        callback = callback ; 
    }

    this.transform = function() { 
        ///start working on the text area ; 
        startLooping.call(this); 
    }

    this.hlClass = function( selector ) { 
        this.selector = selector; 
    }

} 
