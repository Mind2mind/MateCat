<?php

/**
 * Created by PhpStorm.
 * User: fregini
 * Date: 3/11/16
 * Time: 11:00 AM
 */
class FeatureSet {

    private $features = array();

    /**
     * @param array $features
     */
    public function __construct( array $features = array() ) {
        $this->features = $features;
    }

    /**
     * @param $id_customer
     *
     * @return FeatureSet
     */
    public static function fromIdCustomer( $id_customer ) {
        $features = OwnerFeatures_OwnerFeatureDao::getByIdCustomer( $id_customer );
        return new FeatureSet($features);
    }

    /**
     * @param $id_customer
     */
    public function loadFromIdCustomer( $id_customer ) {
        $features = OwnerFeatures_OwnerFeatureDao::getByIdCustomer( $id_customer );
        $this->features = array_merge( $this->features, $features );
    }

    /**
     * Here we popuplate the set with plugins imposed by the config file.
     *
     */
    public function loadFromEnvironment() {
        $features = array() ;

        foreach( INIT::$ENV_DEFINED_PLUGINS as $plugin ) {
            $featureStruct = new OwnerFeatures_OwnerFeatureStruct(array(
                'feature_code' => $plugin
            ));

            if ( $featureStruct->classExists() ) {
                $features[] = $featureStruct ;
            }
        }

        $this->features = array_merge( $this->features, $features );
    }
    
    /**
     * Returns the filtered subject variable passed to all enabled features.
     *
     * @param $method
     * @param $id_customer
     * @param $filterable
     *
     * @return mixed
     *
     * FIXME: this is not a real filter since the input params are not passed
     * modified in cascade to the next function in the queue.
     */
    public function filter($method, $filterable) {
        $args = array_slice( func_get_args(), 1);

        foreach( $this->features as $feature ) {
            $name = "Features\\" . $feature->toClassName() ;
            // XXX FIXME TODO: find a better way for this initialiation, $projectStructure is not defined
            // here, so the feature initializer should not need the project strucutre at all.
            // The `id_customer` should be enough. XXX
            $obj = new $name( $feature );

            if ( method_exists( $obj, $method ) ) {
                $filterable = call_user_func_array( array( $obj, $method ), $args );
            }
        }

        return $filterable ;
    }

    /**
     * @param $method
     */
    public function run( $method ) {
        $args = array_slice( func_get_args(), 1 );

        foreach ( $this->features as $feature ) {
            $name = "Features\\" . $feature->toClassName();
            $obj  = new $name( $feature );

            if ( method_exists( $obj, $method ) ) {
                call_user_func_array( array( $obj, $method ), $args );
            }
        }
    }


}