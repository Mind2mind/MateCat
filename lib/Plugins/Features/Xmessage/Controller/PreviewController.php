<?php
/**
 * Created by PhpStorm.
 * User: fregini
 * Date: 02/05/16
 * Time: 17:46
 */

namespace Features\Xmessage\Controller ;

use Features\Xmessage;

class PreviewController {

    private $response;

    public function __construct( \Klein\Request $request, \Klein\Response $response, $service ) {
        $this->request  = $request;
        $this->response = $response;
        $this->service  = $service;
    }

    public function respond() {
        Xmessage::init();

        $preview = $this->getJMessagesPreview();
        $this->response->json( array( 'preview' => $preview ) );
    }

    private function getJMessagesPreview() {
        $source = $this->request->param( 'text' );
        $locale = $this->request->param( 'locale' );

        $input = array(
                'segment' => $source,
                'locale'  => $locale
        );
        
        $arg = json_encode( $input );

        $cmd = Xmessage::$COMMAND_BASE . ' ' . escapeshellarg( $arg );

        \Log::doLog( $cmd );

        $output = shell_exec( $cmd );

        if ( $output == null ) {
            return null;
        };

        $output = json_decode( $output, true );

        return $output[ 'output' ];
    }
}
