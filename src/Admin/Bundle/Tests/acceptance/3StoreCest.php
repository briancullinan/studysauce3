<?php
namespace Admin\Bundle\Tests;

use Admin\Bundle\Controller\ValidationController;
use Admin\Bundle\Tests\Codeception\Module\AcceptanceHelper;
use Codeception\Module\Doctrine2;
use Doctrine\ORM\EntityManager;
use StudySauce\Bundle\Entity\Invite;
use StudySauce\Bundle\Entity\Response;
use StudySauce\Bundle\Entity\User;
use WebDriver;
use WebDriverBy;
use WebDriverKeys;

/**
 * Class PageLoaderCest
 * @package StudySauce\Bundle\Tests
 * @backupGlobals false
 * @backupStaticAttributes false
 */
class StoreCest
{
    /**
     * @param AcceptanceTester $I
     */
    public function _before(AcceptanceTester $I)
    {
    }

    /**
     * @param AcceptanceTester $I
     */
    public function _after(AcceptanceTester $I)
    {
    }

    /**
     * @param AcceptanceTester $I
     */
    public function tryAddFreeToCart(AcceptanceTester $I) {
        $I->wantTo('Add a free product to the cart and checkout');
        $I->seeAmOnPage('/store');
        if($I->seePageHas('Access denied.')) {
            $I->test('tryAdminLogin');
        }
        $I->seeAmOnPage('/store');
        $I->click('Free');
        $I->click('a[href*="/store/cart"]');
        $I->wait(3);
        $value = $I->grabAttributeFrom('.coupon-row select option:not([value=""]):not([disabled])', 'value');
        $I->selectOption('.coupon-row select', $value);
        $I->click('Place order');
        $I->wait(3);
        $I->see('Thank you');
    }

}