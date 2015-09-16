<?php

namespace StudySauce\Bundle\Controller;

use Doctrine\ORM\EntityManager;
use FOS\UserBundle\Doctrine\UserManager;
use StudySauce\Bundle\Entity\Coupon;
use StudySauce\Bundle\Entity\Invite;
use StudySauce\Bundle\Entity\ParentInvite;
use StudySauce\Bundle\Entity\PartnerInvite;
use StudySauce\Bundle\Entity\Payment;
use StudySauce\Bundle\Entity\StudentInvite;
use StudySauce\Bundle\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\Config\Definition\Exception\Exception;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use TorchAndLaurel\Bundle\Controller\EmailsController as TorchEmailsController;


/**
 * Class BuyController
 * @package StudySauce\Bundle\Controller
 */
class BuyController extends Controller
{

    const AUTHORIZENET_API_LOGIN_ID = "698Cy7dL8U";
    const AUTHORIZENET_TRANSACTION_KEY = "6AWm5h4nSu472Z52";
    const AUTHORIZENET_SANDBOX = true;

    public static $defaultOptions = [
        'monthly' => ['price' => 9.99, 'reoccurs' => 1, 'description' => '$9.99/mo'],
        'yearly' => ['price' => 99, 'reoccurs' => 12, 'description' => '$99/year <sup class="premium">Recommended</sup>']
    ];

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function checkoutAction(Request $request)
    {
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();
        /** @var User $user */
        $user = $this->getUser();
        $csrfToken = $this->has('form.csrf_provider')
            ? $this->get('form.csrf_provider')->generateCsrfToken('checkout')
            : null;

        if(!$user->hasRole('ROLE_GUEST') && !$user->hasRole('ROLE_DEMO')) {
            $first = $user->getFirst();
            $last = $user->getLast();
            $email = $user->getEmail();
            $studentfirst = '';
            $studentlast = '';
            $studentemail = '';
        }
        else
        {
            $first = '';
            $last = '';
            $email = '';
            $studentfirst = '';
            $studentlast = '';
            $studentemail = '';
        }
        /** @var Invite $invite */
        if(!empty($request->getSession()->get('parent')))
        {
            /** @var ParentInvite $invite */
            $invite = $orm->getRepository('StudySauceBundle:ParentInvite')->findOneBy(['code' => $request->getSession()->get('parent')]);
            // set to true when landing anonymously so make sure it actually exists
            if(!empty($invite)) {

                if (empty($invite->getUser()) || $invite->getUser()->hasRole('ROLE_GUEST') || $invite->getUser()->hasRole('ROLE_DEMO')) {
                    $studentfirst = $invite->getFromFirst();
                    $studentlast = $invite->getFromLast();
                    $studentemail = $invite->getFromEmail();
                } else {
                    $studentfirst = $invite->getUser()->getFirst();
                    $studentlast = $invite->getUser()->getLast();
                    $studentemail = $invite->getUser()->getEmail();
                }
            }
        }
        if(!empty($request->getSession()->get('partner')))
        {
            $invite = $orm->getRepository('StudySauceBundle:PartnerInvite')->findOneBy(['code' => $request->getSession()->get('partner')]);
        }
        if(!empty($request->getSession()->get('group')))
        {
            $invite = $orm->getRepository('StudySauceBundle:GroupInvite')->findOneBy(['code' => $request->getSession()->get('group')]);
        }
        if(!empty($request->getSession()->get('student')))
        {
            $invite = $orm->getRepository('StudySauceBundle:StudentInvite')->findOneBy(['code' => $request->getSession()->get('student')]);
        }
        if(!$user->hasRole('ROLE_GUEST') && !$user->hasRole('ROLE_DEMO') && empty($studentfirst) && !empty($invite = $user->getInvitedPartners()->filter(
                function (PartnerInvite $p) {return !$p->getUser()->hasRole('ROLE_PAID') &&
                    !$p->getUser()->hasRole('ROLE_GUEST') && !$p->getUser()->hasRole('ROLE_DEMO');})->first())) {
            $studentfirst = $invite->getUser()->getFirst();
            $studentlast = $invite->getUser()->getLast();
            $studentemail = $invite->getUser()->getEmail();
        }
        if(!$user->hasRole('ROLE_GUEST') && !$user->hasRole('ROLE_DEMO') && empty($studentfirst) && !empty($invite = $user->getInvitedParents()->filter(
                function (ParentInvite $p) {return empty($p->getUser()) || !$p->getUser()->hasRole('ROLE_PAID');})->first())) {

            if(empty($invite->getUser()) || $invite->getUser()->hasRole('ROLE_GUEST') || $invite->getUser()->hasRole('ROLE_DEMO')) {
                $studentfirst = $invite->getFromFirst();
                $studentlast = $invite->getFromLast();
                $studentemail = $invite->getFromEmail();
            }
            else {
                $studentfirst = $invite->getUser()->getFirst();
                $studentlast = $invite->getUser()->getLast();
                $studentemail = $invite->getUser()->getEmail();
            }
        }
        if(!$user->hasRole('ROLE_GUEST') && !$user->hasRole('ROLE_DEMO') && empty($studentfirst) && !empty($invite = $user->getStudentInvites()->filter(
                function (StudentInvite $p) {return empty($p->getUser()) || !$p->getUser()->hasRole('ROLE_PAID');})->first())) {

            /** @var StudentInvite $invite */
            if(empty($invite->getStudent()) || $invite->getStudent()->hasRole('ROLE_GUEST') || $invite->getStudent()->hasRole('ROLE_DEMO')) {
                $studentfirst = $invite->getFirst();
                $studentlast = $invite->getLast();
                $studentemail = $invite->getEmail();
            }
            else {
                $studentfirst = $invite->getStudent()->getFirst();
                $studentlast = $invite->getStudent()->getLast();
                $studentemail = $invite->getStudent()->getEmail();
            }
        }
        /** @var Invite $invite */
        if(!empty($invite))
        {
            $first = $invite->getFirst();
            $last = $invite->getLast();
            $email = $invite->getEmail();
        }

        // set by invite dialogs when invited anonymously
        if(!empty($request->getSession()->get('invite'))) {
            /** @var StudentInvite $student */
            $student = $orm->getRepository('StudySauceBundle:StudentInvite')->findOneBy(['code' => $request->getSession()->get('invite')]);
            if(!empty($student)) {
                $studentfirst = $student->getFirst();
                $studentlast = $student->getLast();
                $studentemail = $student->getEmail();
                $first = $student->getFromFirst();
                $last = $student->getFromLast();
                $email = $student->getFromEmail();
            }
        }

        // check for coupon
        $coupon = $this->getCoupon($request);
        $option = $request->get('option');

        return $this->render('StudySauceBundle:Buy:checkout.html.php', [
                'email' => $email,
                'first' => $first,
                'last' => $last,
                'studentemail' => $studentemail,
                'studentfirst' => $studentfirst,
                'studentlast' => $studentlast,
                'coupon' => $coupon,
                'option' => $option,
                'csrf_token' => $csrfToken
            ]);
    }

    /**
     * @param Request $request
     * @return Coupon
     */
    private function getCoupon(Request $request)
    {
        if(!empty($request)) {
            $code = $request->get('coupon');
            if($request->getSession()->has('coupon')) {
                $code = $request->getSession()->get('coupon');
            }
        }
        if(empty($code))
            return null;

        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();
        $result = $orm->getRepository('StudySauceBundle:Coupon')->findAll();
        foreach($result as $i => $c) {
            /** @var Coupon $c */
            if(strtolower(substr($code, 0, strlen($c->getName()))) == strtolower($c->getName())) {
                // one use coupons should match exactly
                if($c->getMaxUses() <= 1 && strtolower($code) == strtolower($c->getName()))
                    return $c;

                // ensure code exists in random value
                for ($i = 0; $i < $c->getMaxUses(); $i++) {
                    $compareCode = $c->getName() . substr(md5($c->getSeed() . $i), 0, 6);
                    if (strtolower($code) == strtolower($compareCode)) {
                        return $c;
                    }
                }
            }
        }
        return null;
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function applyCouponAction(Request $request)
    {
        if(!empty($request->get('remove'))) {
            $coupon = $this->getCoupon($request);
            $request->getSession()->remove('coupon');
            if(!empty($coupon) && !empty($coupon->getGroup())) {
                $request->getSession()->remove('organization');
            }
            return $this->forward('StudySauceBundle:Buy:checkout', ['_format' => 'tab']);
        }
        $code = $request->get('coupon');
        $coupon = $this->getCoupon($request);
        if(!empty($coupon)) {
            // store coupon in session for use at checkout
            $request->getSession()->set('coupon', $code);
            if(!empty($coupon->getGroup())) {
                $request->getSession()->set('organization', $coupon->getGroup()->getName());
            }
            return $this->forward('StudySauceBundle:Buy:checkout', ['_format' => 'tab']);
        }
        return new JsonResponse(['error' => 'Coupon not found.']);
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\JsonResponse|\Symfony\Component\HttpFoundation\RedirectResponse
     */
    public function payAction(Request $request)
    {
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();
        /** @var $userManager UserManager */
        $userManager = $this->get('fos_user.user_manager');

        // find or create user from checkout form
        /** @var $user \StudySauce\Bundle\Entity\User */
        $user = $this->findAndCreateUser($request);

        $option = $request->get('reoccurs');
        // apply coupon if it exists
        $coupon = $this->getCoupon($request);
        $options = empty($coupon) || empty($coupon->getOptions()) ? self::$defaultOptions : $coupon->getOptions();

        // create a new payment entity
        $payment = new Payment();
        $payment->setUser($user);
        $user->addPayment($payment);
        $payment->setAmount($options[$option]['price']);
        $payment->setFirst($request->get('first'));
        $payment->setLast($request->get('last'));
        $payment->setProduct($option);
        $payment->setEmail($user->getEmail());
        if(!empty($coupon)) {
            $payment->setCoupon($coupon);
        }

        try {
            $sale = new \AuthorizeNetAIM(self::AUTHORIZENET_API_LOGIN_ID, self::AUTHORIZENET_TRANSACTION_KEY);
            $sale->setField('amount', $options[$option]['price']);
            $sale->setField('card_num', $request->get('number'));
            $sale->setField('exp_date', $request->get('month') . '/' . $request->get('year'));
            $sale->setField('first_name', $request->get('first'));
            $sale->setField('last_name', $request->get('last'));
            $sale->setField(
                'address',
                $request->get('street1') .
                (empty(trim($request->get('street2'))) ? '' : ("\n" . $request->get('street2')))
            );
            $sale->setField('city', $request->get('city'));
            $sale->setField('zip', $request->get('zip'));
            $sale->setField('state', $request->get('state'));
            $sale->setField('country', $request->get('country'));
            $sale->setField('card_code', $request->get('ccv'));
            $sale->setField('recurring_billing', true);
            if($this->container->getParameter('authorize_test_mode'))
                $sale->setField('test_request', true);
            else
                $sale->setField('test_request', false);
            $sale->setField('duplicate_window', 120);
            $sale->setSandbox(false);
            $aimResponse = $sale->authorizeAndCapture();
            if ($aimResponse->approved) {
                $payment->setPayment($aimResponse->transaction_id);
            } else {
                $error = $aimResponse->response_reason_text;
            }

            // only set up reoccurring if the term is greater than zero
            if(isset($options[$option]['reoccurs']) && !empty($reoccurs = intval($options[$option]['reoccurs'])) && $reoccurs < 12) {
                $subscription = new \AuthorizeNet_Subscription();
                $subscription->name = 'Study Sauce ' . ucfirst($option) . ' Plan';
                $subscription->intervalLength = $reoccurs;
                $subscription->intervalUnit = 'months';
                $subscription->startDate = date_add(new \DateTime(), new \DateInterval('P' . $reoccurs . 'M'))->format('Y-m-d');
                $subscription->amount = $options[$option]['price'];
                $subscription->creditCardCardNumber = $request->get('number');
                $subscription->creditCardExpirationDate = '20' . $request->get('year') . '-' . $request->get('month');
                $subscription->creditCardCardCode = $request->get('ccv');
                $subscription->billToFirstName = $request->get('first');
                $subscription->billToLastName = $request->get('last');
                $subscription->billToAddress = $request->get('street1') .
                    (empty(trim($request->get('street2'))) ? '' : ("\n" . $request->get('street2')));
                $subscription->billToCity = $request->get('city');
                $subscription->billToZip = $request->get('zip');
                $subscription->billToState = $request->get('state');
                $subscription->billToCountry = $request->get('country');
                $subscription->totalOccurrences = 9999;

                // TODO: if there is a duplicate subscription, increase the price

                // Create the subscription.
                $arbRequest = new \AuthorizeNetARB(self::AUTHORIZENET_API_LOGIN_ID, self::AUTHORIZENET_TRANSACTION_KEY);
                $arbRequest->setSandbox(false);
                $arbResponse = $arbRequest->createSubscription($subscription);
                if ($arbResponse->isOk()) {
                    $payment->setSubscription($arbResponse->getSubscriptionId());
                } else {
                    $error = $arbResponse->getMessageText();
                }
            }

            if (isset($error)) {
                $response = new JsonResponse(['error' => $error]);
            }
            // success
            else {
                // update paid status
                $user->addRole('ROLE_PAID');
                // set group for coupon is necessary
                if(!empty($coupon) && !empty($coupon->getGroup()) && !$user->hasGroup($coupon->getGroup()->getName())) {
                    $user->addGroup($coupon->getGroup());
                }
                $userManager->updateUser($user, false);
                if($user->hasRole('ROLE_PARENT') || $user->hasRole('ROLE_PARTNER') || $user->hasRole('ROLE_ADVISER')) {
                    $response = $this->redirect($this->generateUrl('thanks', ['_format' => 'funnel']));
                }
                // redirect to user area
                else {
                    list($route, $options) = HomeController::getUserRedirect($user);
                    $response = $this->redirect($this->generateUrl($route, $options));
                }
            }
        } catch(\AuthorizeNetException $ex) {
            $this->get('logger')->error('Authorize.Net payment failed');
            $response = new JsonResponse(['error' => 'Could not process payment, please try again later.']);
        }

        $orm->persist($payment);
        $orm->flush();
        if($payment->getPayment() !== null) {
            // send receipt
            $address = $request->get('street1') .
                (empty(trim($request->get('street2'))) ? '' : ("<br />" . $request->get('street2'))) . '<br />' .
                $request->get('city') . ' ' . $request->get('state') . '<br />' .
                $request->get('zip');

            $emails = new EmailsController();
            $emails->setContainer($this->container);
            $emails->invoiceAction($user, $payment, $address);

            // send partner prepay emails if needed
            $this->sendPartnerPrepay($user, $request);
        }

        $loginManager = $this->get('fos_user.security.login_manager');
        $loginManager->loginUser('main', $user, $response);
        return $response;
    }

    /**
     * @param User $user
     * @param Request $request
     */
    private function sendPartnerPrepay(User $user, Request $request)
    {
        $session = $request->getSession();
        if(($session->has('organization') && $session->get('organization') == 'Torch And Laurel') ||
            $user->hasGroup('Torch And Laurel')) {
            $email = new TorchEmailsController();
            $email->setContainer($this->container);
        }
        else {
            $email = new EmailsController();
            $email->setContainer($this->container);
        }

        /** @var $userManager UserManager */
        $userManager = $this->get('fos_user.user_manager');

        /** @var Invite $invite */
        /** @var User $student */
        if(!empty($invite = $user->getStudentInvites()->first())) {
            /** @var StudentInvite $invite */
            $student = $invite->getStudent();
            if(empty($student)) {
                $studentEmail = $invite->getEmail();
                $studentFirst = $invite->getFirst();
                $studentLast = $invite->getLast();
            }
        }
        else if ($user->hasRole('ROLE_PARENT')) {
            // find connected students
            /** @var ParentInvite $invite */
            $invite = $user->getInvitedParents()->first();
            $student = $invite->getUser();
            if(empty($student)) {
                $studentEmail = $invite->getFromEmail();
                $studentFirst = $invite->getFromFirst();
                $studentLast = $invite->getFromLast();
            }
        }
        else if($user->hasRole('ROLE_PARTNER')) {
            // find connected students
            /** @var Invite $invite */
            $invite = $user->getInvitedPartners()->first();
            $student = $invite->getUser();
        }

        // maybe the parent just invited their student
        if(!empty($invite)) {
            // TODO: update student account after registration
            if(!empty($student) && !empty($student->getEmail())) {
                $student->addRole('ROLE_PAID');
                $userManager->updateUser($student);
                $email->parentPrepayAction($user, $student->getEmail(), $student->getFirst(), $student->getLast(), $invite->getCode());
            }
            elseif(!empty($studentEmail) && !empty($studentFirst) && !empty($studentLast)) {
                $email->parentPrepayAction($user, $studentEmail, $studentFirst, $studentLast, $invite->getCode());
            }
        }
    }

    /**
     * @param Request $request
     * @return \StudySauce\Bundle\Entity\User
     */
    private function findAndCreateUser(Request $request)
    {
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();
        /** @var $userManager UserManager */
        $userManager = $this->get('fos_user.user_manager');
        $user = $this->getUser();

        // create a mock invite
        if(!empty($request->get('invite')) && !empty($request->get('invite')['first']) &&
            !empty($request->get('invite')['last']) && !empty($request->get('invite')['email']))
        {
            /** @var User $inviteUser */
            $inviteUser = $userManager->findUserByEmail($request->get('invite')['email']);
            /** @var StudentInvite $invite */
            $invite = new StudentInvite();
            $invite->setUser($user); // might be guest here
            $invite->setFirst($request->get('invite')['first']);
            $invite->setLast($request->get('invite')['last']);
            $invite->setEmail($request->get('invite')['email']);
            $invite->setFromFirst($request->get('first'));
            $invite->setFromLast($request->get('last'));
            $invite->setFromEmail($request->get('email'));
            $invite->setCode(md5(microtime()));
            if(!empty($inviteUser))
                $invite->setStudent($inviteUser);
            $orm->persist($invite);
            $orm->flush();
        }

        // create a user from checkout only if we are currently logged in as guests
        if($user->hasRole('ROLE_GUEST') || $user->hasRole('ROLE_DEMO')) {
            // look up existing user by email address
            /** @var User $user */
            $user = $userManager->findUserByEmail($request->get('email'));

            // create a user if anonymous
            if(empty($user)) {
                $account = new AccountController();
                $account->setContainer($this->container);
                // don't send welcome email if we are inviting a student
                $account->createAction($request, true, !isset($invite));
                $user = $userManager->findUserByEmail($request->get('email'));
            }
            // change invite owner to the actual user
            if(isset($invite)) {
                $invite->setUser($user);
                $user->addStudentInvite($invite);
                $orm->merge($invite);
            }
            $orm->flush();

            // set the context for this load, and log in after transaction is complete
            $context = $this->get('security.context');
            $token = new UsernamePasswordToken($user, $user->getPassword(), 'main', $user->getRoles());
            $context->setToken($token);
            $session = $request->getSession();
            $session->set('_security_main', serialize($token));
        }

        return $user;
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function thanksAction(Request $request)
    {
        if(!empty($request->getSession()->get('signup'))) {
            return $this->render('StudySauceBundle:Business:thanks.html.php');
        }
        return $this->render('StudySauceBundle:Buy:thanks.html.php');
    }

    /**
     * @param User $user
     * @throws \Exception
     * @return \Symfony\Component\HttpFoundation\JsonResponse
     */
    public function cancelPaymentAction(User $user = null)
    {
        /** @var $user User */
        if(empty($user) || !$this->getUser()->hasRole('ROLE_ADMIN'))
            $user = $this->getUser();

        $payments = $user->getPayments()->toArray();
        foreach($payments as $i => $p)
        {
            /** @var Payment $p */
            if(empty($p->getSubscription()))
                continue;
            /** @var Payment $p */
            try {
                $arbRequest = new \AuthorizeNetARB(self::AUTHORIZENET_API_LOGIN_ID, self::AUTHORIZENET_TRANSACTION_KEY);
                $arbRequest->setSandbox(false);
                $arbResponse = $arbRequest->cancelSubscription($p->getSubscription());
                if ($arbResponse->isOk()) {

                }
                else {
                    throw new \Exception($arbResponse->getMessageText());
                }
            }
            catch (\Exception $ex){
                $this->get('logger')->error('Authorize.Net cancel failed: ' . $p->getSubscription());
                throw $ex;
            }
        }

        $user->removeRole('ROLE_PAID');
        /** @var $userManager UserManager */
        $userManager = $this->get('fos_user.user_manager');
        $userManager->updateUser($user);
        return new JsonResponse(true);
    }
}