import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import Register from './Register';
import { Page, User } from '../../../types/index';

// ─── Mocks ───────────────────────────────────────────────────────────────────

let captchaVerifyCallback: ((token: string) => void) | null = null;
let captchaExpireCallback: (() => void) | null = null;
let captchaErrorCallback: (() => void) | null = null;

vi.mock('@hcaptcha/react-hcaptcha', () => ({
  default: vi.fn(({ onVerify, onExpire, onError }: any) => {
    // Capture callbacks on every render
    captchaVerifyCallback = onVerify;
    captchaExpireCallback = onExpire;
    captchaErrorCallback = onError;
    return <div data-testid="hcaptcha-widget">hCaptcha</div>;
  }),
}));

vi.mock('../../../components/ui/GlitchText', () => ({
  default: ({ text, className }: any) => <span className={className}>{text}</span>,
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        registerTitle: 'Criar Conta',
        registerSubtitle: 'Junte-se ao Chrono',
        registerEmail: 'Email',
        registerUsername: 'Nome de usuário',
        registerAvatar: 'Avatar',
        registerUploadAvatar: 'Enviar Avatar',
        registerPassword: 'Senha',
        registerConfirmPass: 'Confirmar Senha',
        registerButton: 'CRIAR CONTA',
        registerHasAccount: 'Já tem uma conta?',
        registerLoginNow: 'Entre agora',
        errorUsernameTooShort: 'Nome de usuário muito curto',
        errorInvalidEmail: 'Formato de email inválido.',
        errorEmailInvalid: 'Email inválido',
        errorFixErrors: 'Corrija os erros antes de continuar.',
        errorPasswordMatch: 'As senhas não coincidem.',
        errorPasswordShort: 'Senha muito curta (mínimo 6 caracteres).',
        errorUsernameSpaces: 'Nome de usuário não pode conter espaços.',
        verifyingAvailability: 'Verificando disponibilidade...',
        emailValid: 'Email válido',
        usernameAvailable: 'Nome de usuário disponível',
        usernameSuggestions: 'Sugestões:',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('../../../components/ui/icons', () => ({
  UserIcon: () => <svg data-testid="user-icon" />,
}));

const mockCheckUsername = vi.fn();
const mockCheckEmail = vi.fn();
const mockRegister = vi.fn();

vi.mock('../../../api', () => ({
  apiClient: {
    checkUsername: (...args: any[]) => mockCheckUsername(...args),
    checkEmail: (...args: any[]) => mockCheckEmail(...args),
    register: (...args: any[]) => mockRegister(...args),
  },
  mapApiUserToUser: vi.fn((u: any) => u),
}));

vi.mock('../../profile/components/FramePreview', () => ({
  default: () => <div data-testid="frame-preview" />,
  getFrameShape: () => 'rounded-full',
}));

vi.mock('../../../utils/avatarGenerator', () => ({
  generateInitialsAvatar: (name: string) => `data:image/svg+xml;base64,${btoa(name)}`,
}));

vi.mock('../../../utils/emojiValidation', () => ({
  validateNoEmojis: (_value: string, _field: string) => ({ valid: true }),
}));

vi.mock('./PasswordStrengthIndicator', () => ({
  default: ({ password }: any) => (
    <div data-testid="password-strength">{password ? 'Força da Senha' : ''}</div>
  ),
}));

vi.mock('../../../hooks/useFormNavigation', () => ({
  useFormNavigation: vi.fn(),
  default: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultProps = {
  users: [] as User[],
  setUsers: vi.fn(),
  onNavigate: vi.fn(),
  onLogin: vi.fn(),
};

function completeCaptcha(token = 'test-captcha-token') {
  act(() => {
    captchaVerifyCallback?.(token);
  });
}

function getEmailInput(container: HTMLElement) {
  return container.querySelector('input[type="email"]') as HTMLInputElement;
}

function getUsernameInput(container: HTMLElement) {
  return container.querySelector('input[type="text"]') as HTMLInputElement;
}

function getPasswordInput() {
  return document.getElementById('password') as HTMLInputElement;
}

function getConfirmPasswordInput() {
  return document.getElementById('confirmPassword') as HTMLInputElement;
}

function submitForm() {
  fireEvent.submit(document.querySelector('form')!);
}

function renderRegister(props = {}) {
  return render(<Register {...defaultProps} {...props} />);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captchaVerifyCallback = null;
    captchaExpireCallback = null;
    captchaErrorCallback = null;

    // Padrão: username e email disponíveis
    mockCheckUsername.mockResolvedValue({ data: { available: true } });
    mockCheckEmail.mockResolvedValue({ data: { valid: true } });
    mockRegister.mockResolvedValue({
      data: { message: 'ok', user: { id: '1', username: 'test', email: 'test@test.com' } },
    });
  });

  // ── Renderização ────────────────────────────────────────────────────────

  it('renderiza o formulário de registro corretamente', () => {
    const { container } = renderRegister();
    expect(screen.getByText('Criar Conta')).toBeInTheDocument();
    expect(screen.getByText('Junte-se ao Chrono')).toBeInTheDocument();
    expect(getEmailInput(container)).toBeInTheDocument();
    expect(getUsernameInput(container)).toBeInTheDocument();
    expect(screen.getByTestId('hcaptcha-widget')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CRIAR CONTA/ })).toBeInTheDocument();
  });

  it('botão de submit está desabilitado antes do captcha', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: /CRIAR CONTA/ })).toBeDisabled();
  });

  it('botão de submit fica habilitado após captcha ser verificado', async () => {
    renderRegister();
    completeCaptcha();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /CRIAR CONTA/ })).not.toBeDisabled()
    );
  });

  it('renderiza link para tela de login', () => {
    renderRegister();
    expect(screen.getByText('Já tem uma conta?')).toBeInTheDocument();
    expect(screen.getByText('Entre agora')).toBeInTheDocument();
  });

  it('navega para a tela de login ao clicar em "Entre agora"', () => {
    const onNavigate = vi.fn();
    renderRegister({ onNavigate });
    fireEvent.click(screen.getByText('Entre agora'));
    expect(onNavigate).toHaveBeenCalledWith(Page.Login);
  });

  // ── Validação de email ───────────────────────────────────────────────────

  it('exibe erro de formato de email inválido ao digitar email malformado', async () => {
    const { container } = renderRegister();
    fireEvent.change(getEmailInput(container), { target: { value: 'email-invalido' } });
    await waitFor(() =>
      expect(screen.getByText('Formato de email inválido.')).toBeInTheDocument()
    );
  });

  it('não chama checkEmail para email com formato inválido', async () => {
    const { container } = renderRegister();
    fireEvent.change(getEmailInput(container), { target: { value: 'nao-e-email' } });
    await waitFor(() =>
      expect(screen.getByText('Formato de email inválido.')).toBeInTheDocument()
    );
    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it('chama apiClient.checkEmail com email válido após debounce', async () => {
    vi.useFakeTimers();
    const { container } = renderRegister();
    fireEvent.change(getEmailInput(container), { target: { value: 'valido@exemplo.com' } });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    vi.useRealTimers();
    await waitFor(() => expect(mockCheckEmail).toHaveBeenCalledWith('valido@exemplo.com'));
  });

  it('exibe mensagem de email válido quando api retorna válido', async () => {
    vi.useFakeTimers();
    const { container } = renderRegister();
    fireEvent.change(getEmailInput(container), { target: { value: 'ok@exemplo.com' } });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByText('Email válido')).toBeInTheDocument());
  });

  it('exibe erro quando email já está em uso', async () => {
    mockCheckEmail.mockResolvedValue({ data: { valid: false, error: 'Email já cadastrado' } });
    vi.useFakeTimers();
    const { container } = renderRegister();
    fireEvent.change(getEmailInput(container), { target: { value: 'existe@exemplo.com' } });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByText('Email já cadastrado')).toBeInTheDocument());
  });

  // ── Validação de username ────────────────────────────────────────────────

  it('exibe erro quando username tem menos de 3 caracteres', async () => {
    vi.useFakeTimers();
    const { container } = renderRegister();
    fireEvent.change(getUsernameInput(container), { target: { value: 'ab' } });
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    vi.useRealTimers();
    await waitFor(() =>
      expect(screen.getByText('Nome de usuário muito curto')).toBeInTheDocument()
    );
  });

  it('chama apiClient.checkUsername para username com 3+ caracteres', async () => {
    vi.useFakeTimers();
    const { container } = renderRegister();
    fireEvent.change(getUsernameInput(container), { target: { value: 'novo_user' } });
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    vi.useRealTimers();
    await waitFor(() => expect(mockCheckUsername).toHaveBeenCalledWith('novo_user'));
  });

  it('exibe "username disponível" quando api confirma disponibilidade', async () => {
    vi.useFakeTimers();
    const { container } = renderRegister();
    fireEvent.change(getUsernameInput(container), { target: { value: 'usuario_livre' } });
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    vi.useRealTimers();
    await waitFor(() =>
      expect(screen.getByText('Nome de usuário disponível')).toBeInTheDocument()
    );
  });

  it('exibe erro e sugestões quando username está indisponível', async () => {
    mockCheckUsername.mockResolvedValue({
      data: {
        available: false,
        error: 'Nome de usuário indisponível',
        suggestions: ['joao123', 'joao_x', 'joao99'],
      },
    });
    vi.useFakeTimers();
    const { container } = renderRegister();
    fireEvent.change(getUsernameInput(container), { target: { value: 'joao' } });
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    vi.useRealTimers();
    await waitFor(() =>
      expect(screen.getByText('Nome de usuário indisponível')).toBeInTheDocument()
    );
    expect(screen.getByText('@joao123')).toBeInTheDocument();
    expect(screen.getByText('@joao_x')).toBeInTheDocument();
    expect(screen.getByText('@joao99')).toBeInTheDocument();
  });

  it('preenche o campo de username ao clicar em uma sugestão', async () => {
    mockCheckUsername.mockResolvedValue({
      data: {
        available: false,
        error: 'Nome de usuário indisponível',
        suggestions: ['joao123'],
      },
    });
    vi.useFakeTimers();
    const { container } = renderRegister();
    const usernameInput = getUsernameInput(container);
    fireEvent.change(usernameInput, { target: { value: 'joao' } });
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByText('@joao123')).toBeInTheDocument());
    fireEvent.click(screen.getByText('@joao123'));
    expect(usernameInput).toHaveValue('joao123');
  });

  // ── Validações no submit ─────────────────────────────────────────────────

  it('exibe erro quando senhas não coincidem', async () => {
    const { container } = renderRegister();
    completeCaptcha();

    fireEvent.change(getEmailInput(container), { target: { value: 'test@example.com' } });
    fireEvent.change(getUsernameInput(container), { target: { value: 'usuario' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'senha123' } });
    fireEvent.change(getConfirmPasswordInput(), { target: { value: 'senha456' } });

    submitForm();

    await waitFor(() =>
      expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument()
    );
  });

  it('exibe erro quando a senha tem menos de 6 caracteres', async () => {
    const { container } = renderRegister();
    completeCaptcha();

    fireEvent.change(getEmailInput(container), { target: { value: 'test@example.com' } });
    fireEvent.change(getUsernameInput(container), { target: { value: 'usuario' } });
    fireEvent.change(getPasswordInput(), { target: { value: '123' } });
    fireEvent.change(getConfirmPasswordInput(), { target: { value: '123' } });

    submitForm();

    await waitFor(() =>
      expect(screen.getByText('Senha muito curta (mínimo 6 caracteres).')).toBeInTheDocument()
    );
  });

  it('exibe erro quando username contém espaços', async () => {
    const { container } = renderRegister();
    completeCaptcha();

    fireEvent.change(getEmailInput(container), { target: { value: 'test@example.com' } });
    fireEvent.change(getUsernameInput(container), { target: { value: 'nome invalido' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'senha123' } });
    fireEvent.change(getConfirmPasswordInput(), { target: { value: 'senha123' } });

    submitForm();

    await waitFor(() =>
      expect(screen.getByText('Nome de usuário não pode conter espaços.')).toBeInTheDocument()
    );
  });

  it('bloqueia submit quando há erros de validação de email pendentes', async () => {
    mockCheckEmail.mockResolvedValue({ data: { valid: false, error: 'Email inválido' } });
    vi.useFakeTimers();
    const { container } = renderRegister();
    completeCaptcha();

    fireEvent.change(getEmailInput(container), { target: { value: 'invalido@example.com' } });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByText('Email inválido')).toBeInTheDocument());

    submitForm();

    await waitFor(() =>
      expect(screen.getByText('Corrija os erros antes de continuar.')).toBeInTheDocument()
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('exibe erro de captcha quando captcha não foi preenchido e formulário é submetido via JS', async () => {
    const { container } = renderRegister();

    fireEvent.change(getEmailInput(container), { target: { value: 'test@test.com' } });
    fireEvent.change(getUsernameInput(container), { target: { value: 'testuser' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'senha123' } });
    fireEvent.change(getConfirmPasswordInput(), { target: { value: 'senha123' } });

    // Submeter via evento direto no form (bypass do disabled no botão)
    submitForm();

    await waitFor(() =>
      expect(screen.getByText('Please complete the captcha verification.')).toBeInTheDocument()
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  // ── Submit com sucesso ───────────────────────────────────────────────────

  it('chama apiClient.register com os dados corretos e navega para Verify', async () => {
    const onNavigate = vi.fn();
    const { container } = renderRegister({ onNavigate });
    completeCaptcha('captcha-valido');

    fireEvent.change(getEmailInput(container), { target: { value: 'novo@teste.com' } });
    fireEvent.change(getUsernameInput(container), { target: { value: 'novousuario' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'SenhaForte1!' } });
    fireEvent.change(getConfirmPasswordInput(), { target: { value: 'SenhaForte1!' } });

    submitForm();

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'novousuario',
          email: 'novo@teste.com',
          password: 'SenhaForte1!',
          captchaToken: 'captcha-valido',
        })
      );
    });

    await waitFor(() =>
      expect(onNavigate).toHaveBeenCalledWith(Page.Verify, 'novo@teste.com')
    );
  });

  // ── Erros da API no submit ───────────────────────────────────────────────

  it('exibe erro quando API de registro retorna erro genérico', async () => {
    mockRegister.mockResolvedValue({ error: 'Erro interno do servidor' });
    const { container } = renderRegister();
    completeCaptcha();

    fireEvent.change(getEmailInput(container), { target: { value: 'user@test.com' } });
    fireEvent.change(getUsernameInput(container), { target: { value: 'testuser' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'SenhaForte1!' } });
    fireEvent.change(getConfirmPasswordInput(), { target: { value: 'SenhaForte1!' } });

    submitForm();

    await waitFor(() =>
      expect(screen.getByText('Erro interno do servidor')).toBeInTheDocument()
    );
  });

  it('exibe erro de username duplicado (409 com field=username)', async () => {
    mockRegister.mockResolvedValue({
      error: 'Nome de usuário já existe',
      status: 409,
      errorData: { field: 'username' },
    });
    const { container } = renderRegister();
    completeCaptcha();

    fireEvent.change(getEmailInput(container), { target: { value: 'novo@test.com' } });
    fireEvent.change(getUsernameInput(container), { target: { value: 'existente' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'SenhaForte1!' } });
    fireEvent.change(getConfirmPasswordInput(), { target: { value: 'SenhaForte1!' } });

    submitForm();

    await waitFor(() =>
      expect(screen.getByText('Nome de usuário já existe')).toBeInTheDocument()
    );
  });

  it('exibe erro de captcha inválido com detalhes', async () => {
    mockRegister.mockResolvedValue({
      error: 'hcaptcha validation failed',
      errorData: { details: ['invalid-input-response'] },
    });
    const { container } = renderRegister();
    completeCaptcha();

    fireEvent.change(getEmailInput(container), { target: { value: 'user@test.com' } });
    fireEvent.change(getUsernameInput(container), { target: { value: 'usuario' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'SenhaForte1!' } });
    fireEvent.change(getConfirmPasswordInput(), { target: { value: 'SenhaForte1!' } });

    submitForm();

    await waitFor(() =>
      expect(
        screen.getByText(/Captcha inválido \(invalid-input-response\)/)
      ).toBeInTheDocument()
    );
  });

  it('exibe mensagem de rate limit no formato correto (segundos)', async () => {
    mockRegister.mockResolvedValue({
      error: 'rateLimitError',
      retryAfter: 30000,
    });
    const { container } = renderRegister();
    completeCaptcha();

    fireEvent.change(getEmailInput(container), { target: { value: 'user@test.com' } });
    fireEvent.change(getUsernameInput(container), { target: { value: 'usuario' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'SenhaForte1!' } });
    fireEvent.change(getConfirmPasswordInput(), { target: { value: 'SenhaForte1!' } });

    submitForm();

    await waitFor(() =>
      expect(
        screen.getByText('Muitas tentativas. Aguarde 30s para tentar novamente.')
      ).toBeInTheDocument()
    );
  });

  it('exibe mensagem de rate limit no formato correto (minutos)', async () => {
    mockRegister.mockResolvedValue({
      error: 'rateLimitError',
      retryAfter: 90000,
    });
    const { container } = renderRegister();
    completeCaptcha();

    fireEvent.change(getEmailInput(container), { target: { value: 'user@test.com' } });
    fireEvent.change(getUsernameInput(container), { target: { value: 'usuario' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'SenhaForte1!' } });
    fireEvent.change(getConfirmPasswordInput(), { target: { value: 'SenhaForte1!' } });

    submitForm();

    await waitFor(() =>
      expect(
        screen.getByText('Muitas tentativas. Aguarde 1m 30s para tentar novamente.')
      ).toBeInTheDocument()
    );
  });

  // ── Captcha eventos ──────────────────────────────────────────────────────

  it('exibe erro ao captcha expirar e desabilita o botão de submit', async () => {
    renderRegister();
    completeCaptcha();
    // Verify button is enabled after captcha
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /CRIAR CONTA/ })).not.toBeDisabled()
    );
    // Expire captcha
    await act(async () => {
      captchaExpireCallback?.();
    });
    expect(screen.getByText('Captcha expired. Please verify again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CRIAR CONTA/ })).toBeDisabled();
  });

  it('exibe erro de falha no captcha', async () => {
    renderRegister();
    await act(async () => {
      captchaErrorCallback?.();
    });
    expect(screen.getByText('Captcha failed. Please try again.')).toBeInTheDocument();
  });

  // ── Avatar ──────────────────────────────────────────────────────────────

  it('exibe ícone padrão quando não há avatar', () => {
    renderRegister();
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  it('exibe avatar gerado pelas iniciais após digitar o username', async () => {
    const { container } = renderRegister();
    fireEvent.change(getUsernameInput(container), { target: { value: 'Pedro' } });
    await waitFor(() => {
      const img = container.querySelector('img[alt="Avatar"]');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src');
    });
  });
});
