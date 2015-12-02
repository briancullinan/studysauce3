<?php

namespace StudySauce\Bundle\Controller;

use Doctrine\ORM\EntityManager;
use FOS\UserBundle\Doctrine\UserManager;
use FOS\UserBundle\Security\LoginManager;
use HWI\Bundle\OAuthBundle\Templating\Helper\OAuthHelper;
use StudySauce\Bundle\Entity\Invite;
use StudySauce\Bundle\Entity\User;
use StudySauce\Bundle\EventListener\InviteListener;
use StudySauce\Bundle\Security\UserProvider;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Encoder\EncoderFactory;
use Symfony\Component\Security\Core\Encoder\MessageDigestPasswordEncoder;
use Symfony\Component\Security\Core\Encoder\PasswordEncoderInterface;
use Symfony\Component\Security\Core\SecurityContext;

/**
 * Class AccountController
 * @package StudySauce\Bundle\Controller
 */
class AccountController extends Controller
{
    /**
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function indexAction()
    {
        $user = $this->getUser();

        $csrfToken = $this->has('form.csrf_provider')
            ? $this->get('form.csrf_provider')->generateCsrfToken('account_update')
            : null;

        // list oauth services
        $services = [];
        /** @var OAuthHelper $oauth */
        $oauth = $this->get('hwi_oauth.templating.helper.oauth');
        foreach ($oauth->getResourceOwners() as $o) {
            $services[$o] = $oauth->getLoginUrl($o);
        }

        return $this->render(
            'StudySauceBundle:Account:tab.html.php',
            [
                'user' => $user,
                'csrf_token' => $csrfToken,
                'services' => $services
            ]
        );
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\JsonResponse
     */
    public function updateAction(Request $request)
    {
        /** @var $userManager UserManager */
        $userManager = $this->get('fos_user.user_manager');
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        /** @var $user User */
        $user = $this->getUser();
        $user->setFirst($request->get('first'));
        $user->setLast($request->get('last'));
        if (!empty($request->get('email'))) {
            // check password
            /** @var EncoderFactory $encoder_service */
            $encoder_service = $this->get('security.encoder_factory');
            /** @var MessageDigestPasswordEncoder $encoder */
            $encoder = $encoder_service->getEncoder($user);
            $encoded_pass = $encoder->encodePassword($request->get('pass'), $user->getSalt());
            if ($user->getPassword() == $encoded_pass) {
                if (!empty($request->get('newPass'))) {
                    $password = $encoder->encodePassword($request->get('newPass'), $user->getSalt());
                    $user->setPassword($password);
                }
                $user->setEmail($request->get('email'));
                $user->setUsername($request->get('email'));
                $userManager->updateCanonicalFields($user);
                $orm->merge($user);
                $orm->flush();
            } else {
                throw new AccessDeniedHttpException('Incorrect password while updating user');
            }
        }

        return new JsonResponse(['csrf_token' => $this->has('form.csrf_provider')
            ? $this->get('form.csrf_provider')->generateCsrfToken('account_update')
            : null]);
    }

    /**
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function deniedAction()
    {
        return $this->render('StudySauceBundle:Exception:error403.html.php');
    }

    public function authenticateAction(Request $request) {
        if(in_array('application/json', $request->getAcceptableContentTypes())) {
            $error = $this->getErrorForRequest($request);
            if(!empty($error)) {
                throw $error;
            }
        }
    }
    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function loginAction(Request $request)
    {
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        // list oauth services
        $services = [];
        /** @var OAuthHelper $oauth */
        $oauth = $this->get('hwi_oauth.templating.helper.oauth');
        /** @var UserProvider $provider */
        $provider = $this->get('my_user_provider');
        foreach ($oauth->getResourceOwners() as $o) {
            if (!$provider->isConnectible($o)) {
                continue;
            }
            $services[$o] = $oauth->getLoginUrl($o);
        }

        /** @var Invite $invite */
        $invite = InviteListener::getInvite($orm, $request);
        $email = $request->get('email');
        if (!empty($invite)) {
            $email = $invite->getEmail();
        }

        $error = $this->getErrorForRequest($request);

        $csrfToken = $this->has('form.csrf_provider')
            ? $this->get('form.csrf_provider')->generateCsrfToken('login')
            : null;

        $templateVars = [
            'email' => $email,
            'csrf_token' => $csrfToken,
            'services' => $services,
            'error' => !empty($error) ? $error->getMessage() : null
        ];

        if(in_array('application/json', $request->getAcceptableContentTypes())) {
            return new JsonResponse($templateVars);
        }
        return $this->render('StudySauceBundle:Account:login.html.php', $templateVars);
    }

    /**
     * Get the security error for a given request.
     *
     * @param Request $request
     *
     * @return string|\Exception
     */
    public static function getErrorForRequest(Request $request)
    {
        $session = $request->getSession();
        if ($request->attributes->has(SecurityContext::AUTHENTICATION_ERROR)) {
            $error = $request->attributes->get(SecurityContext::AUTHENTICATION_ERROR);
        } elseif (null !== $session && $session->has(SecurityContext::AUTHENTICATION_ERROR)) {
            $error = $session->get(SecurityContext::AUTHENTICATION_ERROR);
            $session->remove(SecurityContext::AUTHENTICATION_ERROR);
        } else {
            $error = '';
        }

        return $error;
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function registerAction(Request $request)
    {
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        // list oauth services
        $services = [];
        /** @var OAuthHelper $oauth */
        $oauth = $this->get('hwi_oauth.templating.helper.oauth');
        foreach ($oauth->getResourceOwners() as $o) {
            $services[$o] = $oauth->getLoginUrl($o);
        }

        // always auto fill information for the person the invite was sent to
        /** @var Invite $invite */
        $invite = InviteListener::getInvite($orm, $request);

        if (!empty($invite)) {
            if((in_array('application/json', $request->getAcceptableContentTypes()) || $request->isXmlHttpRequest())
                && $invite->getActivated() && !empty($invite->getInvitee())) {
                return new RedirectResponse($this->generateUrl('login'), 301);
            }
            else {
                $templateVars = [
                    'code' => $invite->getCode(),
                    'email' => $invite->getEmail(),
                    'first' => $invite->getFirst(),
                    'last' => $invite->getLast(),
                    'csrf_token' => $this->has('form.csrf_provider')
                        ? $this->get('form.csrf_provider')->generateCsrfToken('account_create')
                        : null,
                    'services' => $services
                ];
            }
        }
        else {
            if((in_array('application/json', $request->getAcceptableContentTypes()) || $request->isXmlHttpRequest())
                && !empty($request->get('_code'))) {
                throw new NotFoundHttpException('Invite not found for code ' . $request->get('_code'));
            }
            $templateVars = [
                'email' => $request->get('email'),
                'first' => $request->get('first'),
                'last' => $request->get('last'),
                'csrf_token' => $this->has('form.csrf_provider')
                    ? $this->get('form.csrf_provider')->generateCsrfToken('account_create')
                    : null,
                'services' => $services
            ];
        }


        if(in_array('application/json', $request->getAcceptableContentTypes())) {
            return new JsonResponse($templateVars);
        }
        else {
            return $this->render('StudySauceBundle:Account:register.html.php', $templateVars);
        }
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function resetAction(Request $request)
    {
        /** @var $userManager \FOS\UserBundle\Model\UserManagerInterface */
        $userManager = $this->get('fos_user.user_manager');

        $csrfToken = $this->has('form.csrf_provider')
            ? $this->get('form.csrf_provider')->generateCsrfToken('reset')
            : null;

        /** @var User $user */
        if (!empty($request->get('token'))
            && !empty($user = $userManager->findUserByConfirmationToken($request->get('token')))
            && !$user->hasRole('ROLE_GUEST') && !$user->hasRole('ROLE_DEMO') && !empty($request->get('newPass'))
        ) {

            // change the password
            $encoder_service = $this->get('security.encoder_factory');
            /** @var $encoder PasswordEncoderInterface */
            $encoder = $encoder_service->getEncoder($user);
            $password = $encoder->encodePassword($request->get('newPass'), $user->getSalt());
            $user->setPassword($password);

            $user->setConfirmationToken(null);
            $user->setPasswordRequestedAt(null);
            $user->setEnabled(true);
            $userManager->updateUser($user);

            //log in the user automatically after reset
            $context = $this->get('security.context');
            $token = new UsernamePasswordToken($user, $password, 'main', $user->getRoles());
            $context->setToken($token);
            $session = $request->getSession();
            $session->set('_security_main', serialize($token));
            list($route, $options) = HomeController::getUserRedirect($user);
            $response = $this->redirect($this->generateUrl($route, $options));

            /** @var LoginManager $loginManager */
            $loginManager = $this->get('fos_user.security.login_manager');
            $loginManager->loginUser('main', $user, $response);

            return $response;
        } elseif (!empty($request->get('email'))) {
            $user = $userManager->findUserByEmail($request->get('email'));
            if (!empty($user)) {
                // send password reset email
                if ($user->isPasswordRequestNonExpired(
                    $this->container->getParameter('fos_user.resetting.token_ttl')
                )
                ) {
                    // TODO: error?
                }

                if (null === $user->getConfirmationToken()) {
                    /** @var $tokenGenerator \FOS\UserBundle\Util\TokenGeneratorInterface */
                    $tokenGenerator = $this->get('fos_user.util.token_generator');
                    $user->setConfirmationToken($tokenGenerator->generateToken());
                }

                $emails = new EmailsController();
                $emails->setContainer($this->container);
                $emails->resetPasswordAction($user);
                $user->setPasswordRequestedAt(new \DateTime());
                $userManager->updateUser($user);
            } else {
                throw new NotFoundHttpException('No account found, please try an alternate email address.');
            }
        }

        if (empty($user)) {
            $user = $this->getUser();
        }

        $templateVars = [
            'token' => $request->get('token'),
            'email' => $user->hasRole('ROLE_GUEST') || $user->hasRole('ROLE_DEMO') ? $request->get(
                'email'
            ) : $user->getEmail(),
            'csrf_token' => $csrfToken
        ];

        if (in_array('application/json', $request->getAcceptableContentTypes())) {
            return new JsonResponse($templateVars);
        }

        return $this->render('StudySauceBundle:Account:reset.html.php', $templateVars);
    }

    /**
     * @param Request $request
     * @param bool $login
     * @param bool $email
     * @return \Symfony\Component\HttpFoundation\JsonResponse
     */
    public function createAction(Request $request, $login = true, $email = true)
    {
        /** @var $userManager UserManager */
        $userManager = $this->get('fos_user.user_manager');
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        $user = $userManager->findUserByEmail($request->get('email'));

        if ($user == null) {
            // generate a new guest user in the database
            /** @var $user User */
            $user = $userManager->createUser();
            $user->setUsername($request->get('email'));
            $encoder_service = $this->get('security.encoder_factory');
            /** @var $encoder PasswordEncoderInterface */
            $encoder = $encoder_service->getEncoder($user);
            $password = $encoder->encodePassword($request->get('pass'), $user->getSalt());
            $user->setPassword($password);
            $user->setEmail($request->get('email'));
            $userManager->updateCanonicalFields($user);
            $user->addRole('ROLE_USER');
            // assign user to partner
            InviteListener::setInviteRelationship($orm, $request, $user);
            $user->setEnabled(true);
            $user->setFirst($request->get('first'));
            $user->setLast($request->get('last'));
            $userManager->updateUser($user);

            // get the path the user should go to after logging in
            list($route, $options) = HomeController::getUserRedirect($user);
            $response = $this->redirect($this->generateUrl($route, $options));

            if ($login) {
                $context = $this->get('security.context');
                $token = new UsernamePasswordToken($user, $password, 'main', $user->getRoles());
                $context->setToken($token);
                $session = $request->getSession();
                $session->set('_security_main', serialize($token));

                /** @var LoginManager $loginManager */
                $loginManager = $this->get('fos_user.security.login_manager');
                $loginManager->loginUser('main', $user, $response);
            }

            if ($email) {
                // send welcome email
                $emails = new EmailsController();
                $emails->setContainer($this->container);
                if ($user->hasRole('ROLE_PARENT')) {

                } else {
                    if ($user->hasRole('ROLE_PARTNER')) {
                        $emails->welcomePartnerAction($user);
                    } else {
                        $emails->welcomeStudentAction($user);
                    }
                }
            }

            return $response;
        } else {
            return new RedirectResponse($this->generateUrl('login'), 301);
        }
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function removeSocialAction(Request $request)
    {
        /** @var $userManager UserManager */
        $userManager = $this->get('fos_user.user_manager');
        /** @var User $user */
        $user = $this->getUser();
        if ($request->get('remove') == 'gcal') {
            $user->setProperty('showConnected', false);
        }
        $setter = 'set' . ucfirst($request->get('remove'));
        $setter_id = $setter . 'Id';
        $user->$setter_id('');
        $setter_token = $setter . 'AccessToken';
        $user->$setter_token('');
        $userManager->updateUser($user);

        return $this->forward('StudySauceBundle:Account:index', ['_format' => 'tab']);
    }
}

