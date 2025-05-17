window.onload =
    function() {
    const id = document.getElementById( "drawflow" );

    const editor = new Drawflow( id );

    // Parameters
    {
        editor.useuuid = true;
    }

    editor.start();

    window.editor = editor;

    /* Mouse and Touch Actions */
    {
        document.querySelectorAll( ".drag-drawflow" ).forEach( ( element ) => {
            element.addEventListener( "touchend", drop, false );
            element.addEventListener( "touchmove", positionMobile, false );
            element.addEventListener( "touchstart", drag, false );
        } );
    }

    window.mobileItemSelected = "";
    window.mobileLastMpve = null;

    load();
}

function positionMobile( event ) {
    window.mobileLastMove = event;
}

function allowDrop( event ) {
    event.preventDefault();
}

function drag( event ) {
    if ( event.type === "touchstart" ) {
        window.mobileItemSelected = event.target.closest( ".drag-drawflow" )
                                        .getAttribute( "data-node" );

    } else {
        event.dataTransfer.setData( "node",
                                    event.target.getAttribute( "data-node" ) );
    }
}

function drop( event ) {
    if ( event.type === "touchend" ) {
        const parentDrawFlow =
            document
                .elementFromPoint( window.mobileLastMove.touches[ 0 ].clientX,
                                   window.mobileLastMove.touches[ 0 ].clientY )
                .closest( "#drawflow" );

        if ( parentDrawFlow != null ) {
            addNodeToDrawFlow( window.mobileItemSelected,
                               window.mobileLastMove.touches[ 0 ].clientX,
                               window.mobileLastMove.touches[ 0 ].clientY );
        }

        window.mobileItemSelected = "";

    } else {
        event.preventDefault();

        const data = event.dataTransfer.getData( "node" );

        addNodeToDrawFlow( data, event.clientX, event.clientY );
    }
}

const getCanvasPos = ( screenX, screenY ) => {
    const prec = window.editor.precanvas;

    const { clientWidth : cw, clientHeight : ch } = prec;
    const { x : rx, y : ry } = prec.getBoundingClientRect();
    const z = window.editor.zoom;

    const factorX = ( cw / ( cw * z ) );
    const factorY = ( ch / ( ch * z ) );

    return {
        x : ( screenX * factorX - rx * factorX ),
        y : ( screenY * factorY - ry * factorY )
    };
};

function addNodeToDrawFlow( name, screenX, screenY ) {
    if ( window.editor.editor_mode === "fixed" ) {
        return ( false );
    }

    const node = nodes.find( ( node ) => node.name === name );

    if ( !node ) {
        return ( false );
    }

    let { x : posX, y : posY } = getCanvasPos( screenX, screenY );
    const [ inputs, outputs ] = node.io;

    const element = document.createElement( "div" );

    // Title
    {
        const title = document.createElement( "div" );

        title.classList.add( "title-box" );

        title.innerText = node.label;

        element.appendChild( title );
    }

    // Box
    {
        const hasInput = ( typeof node.input !== "undefined" );
        const hasTextarea = ( typeof node.textarea !== "undefined" );
        const hasSelect = ( typeof node.select !== "undefined" );

        if ( hasInput || hasTextarea || hasSelect ) {
            const box = document.createElement( "div" );

            box.classList.add( "box" );

            if ( hasInput ) {
                const p = document.createElement( "p" );

                p.innerText = node.input[ 0 ];

                box.appendChild( p );

                const input = document.createElement( "input" );

                input.type = "text";

                input.setAttribute( "df-" + node.input[ 1 ], "" );

                box.appendChild( input );
            }

            if ( hasTextarea ) {
                const p = document.createElement( "p" );

                p.innerText = node.textarea[ 0 ];

                box.appendChild( p );

                const textarea = document.createElement( "textarea" );

                textarea.setAttribute( "df-" + node.textarea[ 1 ], "" );

                box.appendChild( textarea );
            }

            if ( hasSelect ) {
                const p = document.createElement( "p" );

                p.innerText = node.select[ 0 ];

                box.appendChild( p );

                const select = document.createElement( "select" );

                select.setAttribute( "df-" + node.select[ 1 ], "" );

                for ( const [ text, value ] of node.select[ 2 ] ) {
                    const option = document.createElement( "option" );

                    option.innerText = text;
                    option.value = value;

                    select.appendChild( option );
                }

                box.appendChild( select );
            }

            element.appendChild( box );
        }
    }

    window.editor.addNode(
        name,             // id / type
        inputs, outputs,  // number of
        posX, posY,       // Position
        name,             // class
        node.data,        // data
        element.outerHTML // HTML
    );
}

function load() {
    window.editor.import( JSON.parse( localStorage.getItem( "Home" ) ) );
}

function save() {
    localStorage.setItem( "Home", JSON.stringify( window.editor.export() ) );
}

function getNodeId( node ) { return ( node.id.substr( 5 ) ); }

function getNodeName( node ) {
    return ( node.className.substring( 14 ).split( " " )[ 0 ] );
}

function getNodeFromNodes( node ) {
    const nodeName = getNodeName( node );

    return ( nodes.find( ( node ) => node.name === nodeName ) );
}

function getNextOutput( nodeInEditor ) {
    return ( document.getElementById(
        "node-" + nodeInEditor.outputs.output_1.connections[ 0 ].node ) );
}

function exportPSQL() {
    let psql = "";

    const allNodes = editor.drawflow.drawflow.Home.data;

    document.querySelectorAll( ".begin" ).forEach( ( element ) => {
        psql += getNodeFromNodes( element ).psql;

        const id = getNodeId( element );
        let node = getNextOutput( allNodes[ id ] );

        do {
            const nodeInNodes = getNodeFromNodes( node );
            const id = getNodeId( node );
            const interpolated = nodeInNodes.psql.replace(
                /\$(\w+)/g, ( _, key ) => allNodes[ id ].data[ key ] || "" );

            psql += interpolated;

            node = getNextOutput( allNodes[ id ] );

        } while ( getNodeName( node ) !== "end" );

        psql = psql.slice( 0, -1 ).trim();
        psql += getNodeFromNodes( node ).psql;
    } );

    console.info( psql );

    Swal.fire( {
        background : "#2a2a2a",
        color : "#ffffff",
        html : psql.replace(/\n/g, "<br>"),
        title : "Postgresql query",
    } );
}
