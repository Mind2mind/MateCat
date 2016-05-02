<?php

namespace Features ;

use Features\Xmessage\Controller\PreviewController;
use Klein\Klein;

class Xmessage extends \Features\BaseFeature {

    public static $JAR_PATH ;
    public static $COMMAND_BASE ;

    public function loadRoutes( Klein $klein ) {
        $klein->respond('GET', '/preview', function ($request, $response, $service) {
            $controller = new PreviewController( $request, $response, $service);
            $controller->respond();
        });
    }

    protected function afterConstruct() {

    }

    public static function init() {
        Xmessage::$JAR_PATH = dirname(__FILE__ ) . "/Xmessage/jmessages-preview-1.0-SNAPSHOT.jar"   ;
        Xmessage::$COMMAND_BASE = "java -jar " . Xmessage::$JAR_PATH ;
    }


}