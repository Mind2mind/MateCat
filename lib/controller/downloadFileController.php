<?php

set_time_limit(180);
include_once INIT::$MODEL_ROOT."/queries.php";
include_once INIT::$UTILS_ROOT."/CatUtils.php";
include_once INIT::$UTILS_ROOT."/FileFormatConverter.php";
include_once(INIT::$UTILS_ROOT.'/XliffSAXTranslationReplacer.class.php');
include_once(INIT::$UTILS_ROOT.'/DetectProprietaryXliff.php');


class downloadFileController extends downloadController {

    private $id_job;
    private $password;
    private $fname;
    private $download_type;

    protected $downloadToken;

    public function __construct() {

        INIT::sessionClose();
        parent::__construct();
        $filterArgs = array(
            'filename'      => array( 'filter' => FILTER_SANITIZE_STRING, 'flags' => FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH ),
            'id_file'       => array( 'filter' => FILTER_SANITIZE_NUMBER_INT ),
            'id_job'        => array( 'filter' => FILTER_SANITIZE_NUMBER_INT ),
            'download_type' => array( 'filter' => FILTER_SANITIZE_STRING, 'flags' => FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH ),
            'password'      => array( 'filter' => FILTER_SANITIZE_STRING, 'flags' => FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH ),
            'downloadToken' => array( 'filter' => FILTER_SANITIZE_STRING, 'flags' => FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH ),
        );

        $__postInput = filter_input_array( INPUT_POST, $filterArgs );

        //NOTE: This is for debug purpose only,
        //NOTE: Global $_POST Overriding from CLI Test scripts
        //$__postInput = filter_var_array( $_POST, $filterArgs );

        $this->fname         = $__postInput[ 'filename' ];
        $this->id_file       = $__postInput[ 'id_file' ];
        $this->id_job        = $__postInput[ 'id_job' ];
        $this->download_type = $__postInput[ 'download_type' ];
        $this->password      = $__postInput[ 'password' ];
        $this->downloadToken = $__postInput[ 'downloadToken' ];

        $this->filename      = $this->fname;

        if (empty($this->id_job)) {
            $this->id_job = "Unknown";
        }
    }

    public function doAction() {
        $debug=array();
        $debug['total'][]=time();

        $debug['get_file'][]=time();
        $files_job = getFilesForJob($this->id_job, $this->id_file);
        $debug['get_file'][]=time();
        $nonew = 0;
        $output_content = array();

        /*
        the procedure is now as follows:
        1)original file is loaded from DB into RAM and the flushed in a temp file on disk; a file handler is obtained
        2)RAM gets freed from original content
        3)the file is read chunk by chunk by a stream parser: for each tran-unit that is encountered,
            target is replaced (or added) with the corresponding translation among segments
            the current string in the buffe is flushed on standard output
        4)the temporary file is deleted by another process after some time
        */

        foreach ($files_job as $file) {
            $mime_type = $file['mime_type'];
            $id_file = $file['id_file'];
            $current_filename = $file['filename'];
            $original = $file['xliff_file'];

            //flush file on disk
            $original=str_replace("\r\n","\n",$original);
            //get path
            $path=INIT::$TMP_DOWNLOAD.'/'.$this->id_job.'/'.$id_file.'/'.$current_filename.'.sdlxliff';
            //make dir if doesn't exist
            if(!file_exists(dirname($path))){
                Log::doLog('exec ("chmod 666 ' . $path . '");');
                mkdir(dirname($path), 0777, true);
                exec ("chmod 666 $path");
            }
            //create file
            $fp=fopen($path,'w+');
            //flush file to disk
            fwrite($fp,$original);
            //free memory, as we can work with file on disk now
            unset($original);

            $debug['get_segments'][]=time();
            $data = getSegmentsDownload($this->id_job, $this->password, $id_file, $nonew);

            //get job language and data
            //Fixed Bug: need a specific job, because we need The target Language
            $jobData = getJobData( $this->id_job, $this->password );

            $debug['get_segments'][]=time();
            //create a secondary indexing mechanism on segments' array; this will be useful
            //prepend a string so non-trans unit id ( ex: numerical ) are not overwritten
            foreach($data as $i=>$k){
                $data[ 'matecat|' . $k['internal_id'] ][]=$i;
            }
            $transunit_translation = "";
            $debug['replace'][] = time();
            //instatiate parser
            $xsp = new XliffSAXTranslationReplacer( $path, $data, $jobData['target'] );
            //run parsing
            $xsp->replaceTranslation();
            unset($xsp);
            $debug['replace'][] = time();

            /*
               TEMPORARY HACK
               read header of file (guess first 500B) and detect if it was an old file created on VM TradosAPI (10.30.1.247)
               if so, point the conversion explicitly to this VM and not to the cloud, otherwise conversion will fail
             */
            //get first 500B
            $header_of_file_for_hack=file_get_contents($path.'.out.sdlxliff',false,NULL,-1,500);

            //extract file tag
            preg_match('/<file .*?>/s',$header_of_file_for_hack,$res_header_of_file_for_hack);

            //make it a regular tag
            $file_tag=$res_header_of_file_for_hack[0].'</file>';

            //objectify
            $tag=simplexml_load_string($file_tag);

            //get "original" attribute
            $original_uri=trim($tag['original']);

            $chosen_machine=false;
            if(strpos($original_uri,'C:\automation')!==FALSE){
                $chosen_machine='10.30.1.247';
                log::doLog('Old project detected, falling back to old VM');
            }

            unset($header_of_file_for_hack,$file_tag,$tag,$original_uri);
            /*
               END OF HACK
             */

            $original=file_get_contents($path.'.out.sdlxliff');

            $output_content[$id_file]['content'] = $original;
            $output_content[$id_file]['filename'] = $current_filename;

            //TODO set a flag in database when file uploaded to know if this file is a proprietary xlf converted
            //TODO so we can load from database the original file blob ONLY when needed
            /**
             * Conversion Enforce
             *
             * Check Extentions no more sufficient, we want check content
             * if this is an idiom xlf file type, conversion are enforced
             * $enforcedConversion = true; //( if conversion is enabled )
             *
             * dos2unix must be enabled for xliff forced conversions
             *
             */
            $enforcedConversion = false;
            try {

                $file['original_file'] = @gzinflate($file['original_file']);

                $fileType = DetectProprietaryXliff::getInfoByStringData( $file['original_file'] );
                //Log::doLog( 'Proprietary detection: ' . var_export( $fileType, true ) );

                if( $fileType['proprietary'] == true  ){

                    if( INIT::$CONVERSION_ENABLED && $fileType['proprietary_name'] == 'idiom world server' ){
                        $enforcedConversion = true;

                        //force unix type files
                        $output_content[$id_file]['content'] = CatUtils::dos2unix( $output_content[$id_file]['content'] );

                        Log::doLog( 'Idiom found, conversion Enforced: ' . var_export( $enforcedConversion, true ) );

                    } else {
                        /**
                         * Application misconfiguration.
                         * upload should not be happened, but if we are here, raise an error.
                         * @see upload.class.php
                         * */
                        Log::doLog( "Application misconfiguration. Upload should not be happened, but if we are here, raise an error." );
                        return;
                        //stop execution
                    }
                }
            } catch ( Exception $e ) { Log::doLog( $e->getMessage() ); }


            if ( !in_array($mime_type, array("xliff", "sdlxliff", "xlf")) || $enforcedConversion ) {

                $output_content[$id_file]['out_xliff_name'] = $path.'.out.sdlxliff';
                $output_content[$id_file]['source'] = $jobData['source'];
                $output_content[$id_file]['target'] = $jobData['target'];

                // specs for filename at the task https://app.asana.com/0/1096066951381/2263196383117
                $converter = new FileFormatConverter();
                $debug[ 'do_conversion' ][ ] = time();
                $convertResult = $converter->convertToOriginal( $output_content[ $id_file ], $chosen_machine );
                $output_content[ $id_file ][ 'content' ] = $convertResult[ 'documentContent' ];
                $debug[ 'do_conversion' ][ ] = time();

            }

        }

        //set the file Name
        $pathinfo       = pathinfo( $this->fname );
        $this->filename = $pathinfo['filename']  . "_" . $jobData[ 'target' ] . "." . $pathinfo['extension'];

        //qui prodest to check download type?
//        if ( $this->download_type == 'all' && count( $output_content ) > 1 ) {
        if ( count( $output_content ) > 1 ) {

            if ( $pathinfo[ 'extension' ] != 'zip' ) {
                $this->filename = $pathinfo[ 'basename' ] . ".zip";
            }

            $this->composeZip( $output_content, $jobData[ 'source' ] ); //add zip archive content here;

        } else {
            //always an array with 1 element, pop it, Ex: array( array() )
            $output_content = array_pop( $output_content );
            $this->setContent( $output_content );
        }

        $debug[ 'total' ][ ] = time();

        unlink( $path );
        unlink( $path . '.out.sdlxliff' );
        rmdir( INIT::$TMP_DOWNLOAD . '/' . $this->id_job . '/' . $id_file . '/' );
        rmdir( INIT::$TMP_DOWNLOAD . '/' . $this->id_job . '/' );

    }

    private function setContent( $output_content ) {

        $this->filename = $this->sanitizeFileName( $output_content['filename'] );
        $this->content = $output_content['content'];

    }

    private function sanitizeFileName( $filename ){

        $pathinfo = pathinfo( $filename );

        if ( strtolower( $pathinfo[ 'extension' ] ) == 'pdf' ) {
            $filename = $pathinfo[ 'basename' ] . ".docx";
        }

        return $filename;

    }

    private function composeZip( $output_content, $sourceLang ) {

        $file = tempnam("/tmp", "zipmatecat");
        $zip = new ZipArchive();
        $zip->open($file, ZipArchive::OVERWRITE);

        // Staff with content
        foreach ($output_content as $f) {

            $f[ 'filename' ] = $this->sanitizeFileName( $f[ 'filename' ] );

            //Php Zip bug, utf-8 not supported
            $sourceLang = str_replace( "-", "_", $sourceLang );
            setlocale( LC_CTYPE, $sourceLang );
            $fName = iconv( "UTF-8", 'ASCII//TRANSLIT', $f['filename'] );

            $fName = preg_replace( '/[^\p{L}0-9a-zA-Z_\.\-]/u', "_", $fName );
            $fName = preg_replace( '/[_]{2,}/', "_", $fName );
            $fName = str_replace( '_.', ".", $fName );

            $nFinfo = pathinfo($fName);
            $_name    = $nFinfo['filename'];
            if( strlen( $_name ) < 3 ){
                $fName = substr( uniqid(), -5 ) . "_" . $fName;
            }

            $zip->addFromString( $fName, $f['content'] );

        }

        // Close and send to users
        $zip->close();
        $zip_content = file_get_contents("$file");
        unlink($file);

        $this->content =  $zip_content;

    }

}
