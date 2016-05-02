<?php
/**
 * Created by PhpStorm.
 * User: fregini
 * Date: 02/05/16
 * Time: 17:46
 */

namespace Features\Xmessage;



class PreviewController {

    public function __construct( \Klein\Request $request, \Klein\Response $response, $service ) {
        $this->request  = $request;
        $this->response = $response;
        $this->service  = $service;
    }

}