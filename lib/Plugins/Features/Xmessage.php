<?php

namespace Features ;

class Xmessage extends \Features\BaseFeature {

    public function loadRoutes() {
        $klein->respond('GET', '/xmessage/preview', function ($request, $response, $service) {
            $controller = new Controller\QualityReportController( $request, $response, $service);
            $template_path = dirname(__FILE__) . '/ReviewImproved/View/Html/quality_report.html' ;
            $controller->setView( $template_path );
            $controller->respond();
        });
    }

}