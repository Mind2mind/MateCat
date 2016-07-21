<?php

/**
 * Created by PhpStorm.
 * User: fregini
 * Date: 20/07/16
 * Time: 15:26
 */
class Engines_MyMemory_GlossaryImport {

    /** @var int The size after which we are sending a new file with a new post */
    private $chunkSize = 1000 ;
    /** @var Engines_MyMemory the engine instance to run the call */
    private $engine ;
    /** @var Engines_MyMemory_TempGlossaryFile[] the array of temporary files we created, to be sent to MyMemory */
    private $tempfiles = array();
    /** @var int the line number we are currently iterating */
    private $currentLineNumber = 0 ;
    /** @var int the current chunk line number, used to determine if a new chunk is needed */
    private $currentChunkLineNumber = 0;
    /** @var array the line to send to file  */
    private $splittedLine ;

    private $sourceLang ;

    private $targetLang ;

    private $requestResutls = array();

    private $key ;
    private $name ;

    private $file ;

    public function __construct( Engines_MyMemory $engine, $key, $name ) {
        $this->engine = $engine ;
        $this->name = $name ;
        $this->key = $key ;
    }

    /**
     * @param $chunkSize
     */
    public function setChunkSize($chunkSize) {
        $this->chunkSize = $chunkSize ;
    }


    /**
     * @param $file
     *
     * @return Engines_Results_MyMemory_TmxResponse
     */
    public function importGlossary( $file ) {
        $this->file = $file ;
        Log::doLog('importGlossary: $file: ' . $file );

        $this->tempfiles = array();

        try {
            $origFile = new SplFileObject( $file, 'r+' );
            $origFile->setFlags( SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::READ_AHEAD );

            foreach ( $origFile as $line_num => $line ) {

                $this->currentLineNumber = $line_num ;
                $this->splittedLine = $line ;

                if( count( $this->splittedLine ) < 2 ){
                    throw new RuntimeException( "No valid glossary file provided. Field separator is not valid." );
                }

                if ( $this->currentLineNumber == 0 ){
                    $this->validateSourceAndTargetLang( $line );
                }
                else {
                    $this->pushLineToTempFile();
                }
            }

        } catch( RuntimeException $e ){
            $file = $this->getCurrentFile() ;
            $file->postResult = new Engines_Results_MyMemory_TmxResponse( array(
                    "responseStatus"  => 406,
                    "responseData"    => null,
                    "responseDetails" => $e->getMessage()
            ) );

            return $file->postResult ;
        }

        $this->doPostRequests();
    }


    private function doPostRequests() {
        reset($this->tempfiles);

        foreach( $this->tempfiles as $file ) {
            $postFields = array(
                    'glossary'    => "@" . realpath( $file->name ),
                    'source_lang' => $this->sourceLang,
                    'target_lang' => $this->targetLang,
                    'name'        => $this->name,
            );

            $postFields[ 'key' ] = trim( $this->key );

            $this->engine->call('glossary_import_relative_url', $postFields, true);
            $file->postResult = $this->engine->getResult() ;

            // TODO: check post result here, if good then go on
            // if error then quit
        }
    }

    private function pushLineToTempFile() {
        $currentFile = $this->getCurrentFile() ;
        $currentFile->fileLink->fputcsv( $this->splittedLine );
        $this->currentChunkLineNumber++ ;
    }

    /**
     * @return Engines_MyMemory_TempGlossaryFile
     */
    private function getCurrentFile() {

        if ( count($this->tempfiles ) == 0 ) {
            // first case
            array_push( $this->tempfiles, new Engines_MyMemory_TempGlossaryFile($this->file, count($this->tempfiles) ) );
        }
        else if ( $this->currentChunkLineNumber >= $this->chunkSize ) {
            // new file needed for chunk limit passed
            // close previous

            /**
             * @var $fileToClose Engines_MyMemory_TempGlossaryFile
             */

            $fileToClose = end( $this->tempfiles );
            $fileToClose->fileLink->fflush() ;
            $this->currentChunkLineNumber = 0 ;
            Log::doLog('importGlossary closing file: '. $fileToClose->name );

            array_push( $this->tempfiles, new Engines_MyMemory_TempGlossaryFile($this->file, count($this->tempfiles) ) );
        }

        return  end( $this->tempfiles );
    }


    private function validateSourceAndTargetLang( $line ) {
        list( $sourceLang, $targetLang, ) = $line;

        //eventually, remove BOM from source language
        $bom = pack('H*','EFBBBF');
        $sourceLang = preg_replace("/^$bom/","",$sourceLang);

        if ( !Langs_Languages::getInstance()->isEnabled( $sourceLang ) ) {
            throw new RuntimeException( "The source language specified in the glossary is not supported: " . $sourceLang );
        }

        if ( !Langs_Languages::getInstance()->isEnabled( $targetLang ) ) {
            throw new RuntimeException( "The target language specified in the glossary is not supported: " . $targetLang );
        }

        if ( empty( $sourceLang ) || empty( $targetLang ) ) {
            throw new RuntimeException( "No language definition found in glossary file." );
        }

        $this->sourceLang = $sourceLang;
        $this->targetLang = $targetLang;

    }

    public function getLastResult() {
        /** @var $lastFile Engines_MyMemory_TempGlossaryFile */
        $lastFile = end($this->tempfiles);
        return $lastFile->postResult ;
    }

}