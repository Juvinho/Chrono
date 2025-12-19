import { User } from '../types';

const firstNames = ['Alex', 'Bia', 'Carlos', 'Dani', 'Leo', 'Gabi', 'Lucas', 'Sofia', 'Mateus', 'Julia', 'Pedro', 'Laura', 'Rafa', 'Manu', 'Thiago'];
const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nunes', 'Melo', 'Cardoso'];
const bios = [
    'Apenas vivendo um dia de cada vez.', 'Amante de café e boas conversas.', 'Explorando o mundo.', 'Sempre em busca de algo novo.',
    'Fã de filmes e séries.', 'Tentando ser uma pessoa melhor.', 'Compartilhando um pouco do meu dia.',
    'A vida é curta, aproveite.', 'Sonhador.', 'Leitor voraz.',
    'Música é minha paixão.', 'Viajante nas horas vagas.', 'Apenas mais um na multidão.',
];


export const generateUsers = (count: number): User[] => {
    const users: User[] = [];
    const usedUsernames = new Set<string>();

    for (let i = 0; i < count; i++) {
        let username = '';
        do {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const num = Math.floor(Math.random() * 999);
            username = `${firstName}${lastName}${num}`;
        } while (usedUsernames.has(username));
        
        usedUsernames.add(username);

        const user: User = {
            username,
            email: `${username.toLowerCase()}@chrono.net`,
            password: 'password123',
            avatar: `https://picsum.photos/seed/${username}/100/100`,
            bio: bios[Math.floor(Math.random() * bios.length)],
            birthday: `${2000 + Math.floor(Math.random() * 5)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
            coverImage: `https://picsum.photos/seed/${username}_cover/1200/400`,
            followers: Math.floor(Math.random() * 2000),
            following: Math.floor(Math.random() * 300),
            isPrivate: Math.random() < 0.2,
            isVerified: Math.random() < 0.05,
        };
        users.push(user);
    }
    return users;
};