export interface ReferralRecord {
  id: string
  referrerId: string
  referredUserId: string
  date: Date
  plan: string
  amount: number
  commission: number
}

export const mockUsers = [
  {
    id: 'user1',
    name: 'Rahul',
    email: 'rahul@example.com',
    referralCode: 'JK-RAHUL12',
    premium: false,
    referrals: [
      {
        id: 'ref1',
        referrerId: 'user1',
        referredUserId: 'user2',
        date: new Date('2024-03-01'),
        plan: 'Monthly',
        amount: 199,
        commission: 39.8,
      },
      {
        id: 'ref2',
        referrerId: 'user1',
        referredUserId: 'user3',
        date: new Date('2024-03-05'),
        plan: 'Quarterly',
        amount: 499,
        commission: 99.8,
      },
      {
        id: 'ref3',
        referrerId: 'user1',
        referredUserId: 'user4',
        date: new Date('2024-03-10'),
        plan: 'Annual',
        amount: 1499,
        commission: 299.8,
      },
    ],
  },
]
