<?php  //[STAMP] a188e722d64c4813f984135221920836
namespace _generated;

// This class was automatically generated by build task
// You should not change it manually as it will be overwritten on next build
// @codingStandardsIgnoreFile

use Codeception\Module\CodeHelper;
use Codeception\Module\EmulateModuleHelper;

trait CodeGuyActions
{
    /**
     * @return \Codeception\Scenario
     */
    abstract protected function getScenario();

    
    /**
     * [!] Method is generated. Documentation taken from corresponding module.
     *
     *
     * Conditional Assertion: Test won't be stopped on fail
     * @see \Codeception\Module\EmulateModuleHelper::seeEquals()
     */
    public function canSeeEquals($expected, $actual) {
        return $this->getScenario()->runStep(new \Codeception\Step\ConditionalAssertion('seeEquals', func_get_args()));
    }
    /**
     * [!] Method is generated. Documentation taken from corresponding module.
     *
     *
     * @see \Codeception\Module\EmulateModuleHelper::seeEquals()
     */
    public function seeEquals($expected, $actual) {
        return $this->getScenario()->runStep(new \Codeception\Step\Assertion('seeEquals', func_get_args()));
    }

 
    /**
     * [!] Method is generated. Documentation taken from corresponding module.
     *
     *
     * Conditional Assertion: Test won't be stopped on fail
     * @see \Codeception\Module\EmulateModuleHelper::seeFeaturesEquals()
     */
    public function canSeeFeaturesEquals($expected) {
        return $this->getScenario()->runStep(new \Codeception\Step\ConditionalAssertion('seeFeaturesEquals', func_get_args()));
    }
    /**
     * [!] Method is generated. Documentation taken from corresponding module.
     *
     *
     * @see \Codeception\Module\EmulateModuleHelper::seeFeaturesEquals()
     */
    public function seeFeaturesEquals($expected) {
        return $this->getScenario()->runStep(new \Codeception\Step\Assertion('seeFeaturesEquals', func_get_args()));
    }
}
