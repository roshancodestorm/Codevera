import csv
import random
from faker import Faker

print("Initializing Generators for 1 Million Rows...")
# Handle Windows code pages sometimes causing issues with Faker inside fast loops
fake = Faker('en_IN')

# Pre-generate pools to speed up generation 100x faster
print("Pre-generating data pools for faster speed...")
names = [fake.name() for _ in range(10000)]
cities = [fake.city() for _ in range(1000)]
states = [fake.state() for _ in range(50)]

file_name = "data_1M.csv"

print("Writing 1,000,000 rows to CSV file...")
count = 0
with open(file_name, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    
    # Header
    writer.writerow([
        "id", "name", "email", "mobile_number",
        "city", "state", "country", "signup_date"
    ])
    
    for i in range(1, 1000001):
        name = random.choice(names)
        city = random.choice(cities)
        state = random.choice(states)
        
        # Fast guarantee for uniqueness 
        email = f"{name.lower().replace(' ', '').replace('.', '')}{i}@example.com"
        mobile = str(random.randint(6000000000, 9999999999))
        country = "India"
        date = fake.date_between(start_date='-5y', end_date='today')
        
        writer.writerow([
            i, name, email, mobile,
            city, state, country, date
        ])
        count += 1
        
        if count % 100000 == 0:
            print(f"Progress: {(count / 10000):.0f}% written...")

print("1 Million rows CSV created successfully!")
