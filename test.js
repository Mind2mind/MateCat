

/** 
 * This class takes a dom node as input searches for the word applying a transformation funciton. 
 * If the node contains the cursor, the cursor is left in place during transformation. 
 *
 */

var Transformer = function( element ) { 
    var term = null; 
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
        var escaped = escapeRegExp( term );
        var expForReplace = new RegExp('\\b(' + escaped + ')\\b',"g");

        newText = node.textContent.replace(
            expForReplace , '<span class="' + this.selector + '">$1</span>'
        );

        if ( $(node).parent().hasClass( this.selector ) ) {
            $(node).unwrap();
        }

        $(node).replaceWith( newText );
    }

    var removeParentAndPreserveCaret = function() {
        var r = window.getSelection().getRangeAt(0);
        var offset = r.endOffset ;

        // TODO: fix this selector
        var parent = $(r.endContainer).parent('.' + this.selector ) ;

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

    var startLooping = function() { 
        selection = window.getSelection(); 

        if ( selection.rangeCount === 0 ) { 
            // TODO: ingore if it's a selection, only consider caret position 
        }

        else { 
            this.currentRange = selection.getRangeAt(0); 
        }

        descend.call( this, this.element, this.term ); 
    };

    var isolateCaret = function( node, term ) { 
        // first off, see if the node is already wrapper and remove the parent
        removeParentAndPreserveCaret.call(this);

        // then split the text we want to replace stands in its own text node
        var escaped = escapeRegExp( term );
        var expForSplit = new RegExp('\\b' + escaped + '\\b',"g");
        var baseNode = node.cloneNode() ;
        var matches ; 
        var rightPart ; 
        var leftPart ; 

        var chunks = []; 
        while ((match = expForSplit.exec( node.textContent )) !== null) {
            if ( match.index === 0 ) { 
                continue ; 
            }

            var rightPart = node.splitText( match.index );
            var leftPart = rightPart.previousSibling ;

            chunks.push( leftPart ); 

            node = baseNode.cloneNode(); 
        }

        chunks.push( rightPart ); 

        console.log( chunks ); 

        // ok now we splitted nodes 
    };

    var analyze = function(node, term) { 

        // is the current node matching the one with caret?

        if ( this.currentRange && node === this.currentRange.endContainer ) {
            isolateCaret.call( this, node, term ) ; 
        } else { 
            searchAndReplaceWord.call(this, node, term ); 
        }

    }

    var descend = function(node, term) { 
        node.contents().each( function(index, node) {
            switch( this.nodeType ) {
              case 3:
                analyze.call( that, node,  term );
                break;
              case 1:
                descend.call( that, $(node), term );
                break ;
              default:
                console.log('not interested in node type', this.nodeType );
            };
        });
    }

    this.setSearch = function( str ) { 
        this.term = str ; 
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
